import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    const body = await req.json();
    const { email } = body;

    if (!email) {
      throw new Error('Email is required');
    }

    // Get user profile by email
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email, client_name, airtable_client_id, created_at')
      .eq('email', email);

    if (profileError) throw profileError;

    const profile = profiles?.[0];

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: 'No profile found for this email',
          email
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If they have an airtable_client_id, fetch the client info from Airtable
    let airtableClient = null;
    if (profile.airtable_client_id) {
      const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
      const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

      if (airtableToken && airtableBaseId) {
        const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Clients/${profile.airtable_client_id}`;
        const response = await fetch(airtableUrl, {
          headers: {
            'Authorization': `Bearer ${airtableToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          airtableClient = {
            id: data.id,
            name: data.fields['Client Name'] || data.fields['Name'],
            email: data.fields['Email'],
          };
        } else {
          airtableClient = { error: `Could not fetch Airtable client: ${response.status}` };
        }
      }
    }

    // Also count leads for this client in Airtable
    let leadCount = { total: 0, approved: 0 };
    if (profile.airtable_client_id) {
      const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
      const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

      if (airtableToken && airtableBaseId) {
        // Count all leads
        const allLeadsFilter = `FIND('${profile.airtable_client_id}', ARRAYJOIN({Clients}))`;
        const allLeadsUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table?filterByFormula=${encodeURIComponent(allLeadsFilter)}`;

        const allResponse = await fetch(allLeadsUrl, {
          headers: {
            'Authorization': `Bearer ${airtableToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (allResponse.ok) {
          const allData = await allResponse.json();
          leadCount.total = allData.records?.length || 0;
          leadCount.approved = allData.records?.filter((r: any) => r.fields['Status'] === 'Approved').length || 0;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: profile.id,
          email: profile.email,
          client_name: profile.client_name,
          airtable_client_id: profile.airtable_client_id,
          created_at: profile.created_at,
        },
        airtableClient,
        leadCount,
        diagnosis: !profile.airtable_client_id
          ? 'PROBLEM: No airtable_client_id set in profile. User was not properly linked during invite.'
          : !airtableClient
            ? 'PROBLEM: airtable_client_id is set but could not find matching Airtable record'
            : leadCount.total === 0
              ? 'PROBLEM: Client is linked but no leads are assigned to this client in Airtable'
              : leadCount.approved === 0
                ? `PROBLEM: ${leadCount.total} leads assigned but NONE have Status = "Approved". Client only sees approved leads.`
                : `OK: Client is properly linked. ${leadCount.approved}/${leadCount.total} leads are approved and visible.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
