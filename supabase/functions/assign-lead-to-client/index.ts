import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Get both client_name and airtable_client_id
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

    // Get the client name to use - this is the value that will be matched in Airtable
    const clientName = client.client_name?.trim();

    if (!clientName) {
      throw new Error('Client name not configured. Please set a client name in Client Management.');
    }

    const tableName = encodeURIComponent('Qualified Lead Table');
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${leadId}`;

    // Try with airtable_client_id first (linked record), fall back to client name (text field)
    let response;
    let clientValue: any;

    if (client.airtable_client_id) {
      // Try as linked record field first
      clientValue = [client.airtable_client_id];
      console.log('Attempting to assign with Airtable client ID (linked record):', clientValue);

      response = await fetch(airtableUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: { 'Clients': clientValue }
        })
      });

      // If linked record fails, try as text
      if (!response.ok) {
        const errorBody = await response.text();
        console.log('Linked record approach failed, trying as text field. Error:', errorBody);

        clientValue = clientName;
        response = await fetch(airtableUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${airtableToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: { 'Clients': clientValue }
          })
        });
      }
    } else {
      // No Airtable client ID, use client name directly
      clientValue = clientName;
      console.log('Assigning with client name (text field):', clientValue);

      response = await fetch(airtableUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: { 'Clients': clientValue }
        })
      });
    }

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
