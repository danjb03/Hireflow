import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserWithPreferences {
  id: string;
  email: string;
  clientName: string | null;
  leadNotificationsEnabled: boolean;
}

interface ClientWithUsers {
  clientId: string;
  clientName: string;
  users: UserWithPreferences[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Use admin client for role check and data fetching
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some((r: { role: string }) => r.role === 'admin');
    if (!isAdmin) throw new Error('Admin access required');

    // Get Airtable config
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Fetch clients from Airtable
    const tableName = encodeURIComponent('Clients');
    let allAirtableClients: Array<{ id: string; name: string }> = [];
    let offset: string | undefined;

    do {
      const url = offset
        ? `https://api.airtable.com/v0/${airtableBaseId}/${tableName}?offset=${offset}`
        : `https://api.airtable.com/v0/${airtableBaseId}/${tableName}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${airtableToken}` }
      });

      if (!response.ok) throw new Error('Failed to fetch Airtable clients');

      const data = await response.json();
      const clients = (data.records || []).map((r: { id: string; fields: Record<string, string> }) => ({
        id: r.id,
        name: r.fields['Client Name'] || r.fields['Name'] || 'Unnamed'
      }));
      allAirtableClients = allAirtableClients.concat(clients);
      offset = data.offset;
    } while (offset);

    // Get all profiles with airtable_client_id
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, client_name, airtable_client_id')
      .not('airtable_client_id', 'is', null);

    if (profilesError) throw profilesError;

    // Get all notification preferences
    const { data: preferences, error: prefsError } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, lead_notifications_enabled');

    if (prefsError && !prefsError.message.includes('does not exist')) {
      throw prefsError;
    }

    // Create a map of user_id -> preferences
    const prefsMap = new Map<string, boolean>();
    for (const pref of preferences || []) {
      prefsMap.set(pref.user_id, pref.lead_notifications_enabled);
    }

    // Group users by client
    const clientUsersMap = new Map<string, UserWithPreferences[]>();

    for (const profile of profiles || []) {
      const clientId = profile.airtable_client_id;
      if (!clientId) continue;

      const userWithPrefs: UserWithPreferences = {
        id: profile.id,
        email: profile.email,
        clientName: profile.client_name,
        // Default to true if no preference record exists
        leadNotificationsEnabled: prefsMap.get(profile.id) ?? true
      };

      if (!clientUsersMap.has(clientId)) {
        clientUsersMap.set(clientId, []);
      }
      clientUsersMap.get(clientId)!.push(userWithPrefs);
    }

    // Build final response with client info
    const clientsWithUsers: ClientWithUsers[] = [];

    for (const airtableClient of allAirtableClients) {
      const users = clientUsersMap.get(airtableClient.id) || [];
      // Only include clients that have at least one user
      if (users.length > 0) {
        clientsWithUsers.push({
          clientId: airtableClient.id,
          clientName: airtableClient.name,
          users: users.sort((a, b) => a.email.localeCompare(b.email))
        });
      }
    }

    // Sort by client name
    clientsWithUsers.sort((a, b) => a.clientName.localeCompare(b.clientName));

    return new Response(
      JSON.stringify({ clients: clientsWithUsers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
