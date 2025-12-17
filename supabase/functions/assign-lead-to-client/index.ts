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

    const { leadId, clientId } = await req.json();
    if (!leadId || !clientId) throw new Error('Lead ID and Client ID required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Use service role key to bypass RLS for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get both client_name and airtable_client_id from profile
    const { data: client, error: clientError } = await supabaseAdmin
      .from('profiles')
      .select('client_name, airtable_client_id')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }
    if (!client) throw new Error('Client not found. Please check the client ID.');

    console.log('Client profile found:', {
      clientId,
      client_name: client.client_name,
      airtable_client_id: client.airtable_client_id
    });

    const clientName = client.client_name?.trim();
    if (!clientName) {
      throw new Error('Client name not configured. Please set a client name in Client Management.');
    }

    // Get the Airtable client record ID
    let airtableClientId = client.airtable_client_id;

    // If no airtable_client_id in profile, look it up from Airtable Clients table by name
    if (!airtableClientId) {
      console.log('No airtable_client_id in profile, looking up by client name:', clientName);

      const filterFormula = `{Client Name} = '${clientName.replace(/'/g, "\\'")}'`;
      const clientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/Clients?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;

      const clientsResponse = await fetch(clientsUrl, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        if (clientsData.records && clientsData.records.length > 0) {
          airtableClientId = clientsData.records[0].id;
          console.log('Found Airtable client record ID:', airtableClientId);

          // Update the profile with the airtable_client_id for future use
          await supabaseAdmin
            .from('profiles')
            .update({ airtable_client_id: airtableClientId })
            .eq('id', clientId);
          console.log('Updated profile with airtable_client_id');
        } else {
          console.warn('No matching client found in Airtable Clients table for name:', clientName);
          throw new Error(`Client "${clientName}" not found in Airtable. Please ensure the client exists in the Airtable Clients table.`);
        }
      } else {
        const errorBody = await clientsResponse.text();
        console.error('Failed to look up client in Airtable:', errorBody);
        throw new Error('Failed to look up client in Airtable');
      }
    }

    // Now we have the Airtable client record ID - use it as a linked record array
    const clientValue = [airtableClientId];
    console.log('Assigning lead with Airtable client ID:', clientValue);

    const tableName = encodeURIComponent('Qualified Lead Table');
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${leadId}`;

    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { 'Clients': clientValue }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Airtable API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: airtableUrl,
        clientValue
      });
      throw new Error(`Failed to assign lead in Airtable: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    console.log('Successfully assigned lead:', result.id, 'to client:', clientValue);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error assigning lead to client:', error);
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
