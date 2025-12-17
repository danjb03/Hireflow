import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Fetch actual client records from Clients table
    // URL encode the table name in case it has special characters
    const tableName = encodeURIComponent('Clients');
    let clientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}`;
    let allClients: any[] = [];
    let offset: string | undefined = undefined;

    // Handle pagination - Airtable returns max 100 records per request
    do {
      const urlWithOffset = offset ? `${clientsUrl}?offset=${offset}` : clientsUrl;
      const response = await fetch(urlWithOffset, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Airtable API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          url: urlWithOffset
        });
        throw new Error(`Failed to fetch clients from Airtable: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      
      // Map clients to { id, name } format
      const pageClients = (data.records || []).map((record: any) => ({
        id: record.id,
        name: record.fields['Client Name'] || record.fields['Name'] || 'Unnamed Client',
        email: record.fields['Email'] || null,
        status: record.fields['Status'] || null
      }));
      
      allClients = allClients.concat(pageClients);
      offset = data.offset; // Get offset for next page if it exists
    } while (offset);

    return new Response(
      JSON.stringify({ clients: allClients }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Airtable clients:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

