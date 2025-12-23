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
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Unauthorized: ${authError.message}`);
    }
    if (!user) {
      throw new Error('Unauthorized: No user found');
    }

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    // Now we receive the Airtable client ID directly from the frontend
    const { leadId, airtableClientId } = await req.json();
    if (!leadId) throw new Error('Lead ID is required');
    if (!airtableClientId) throw new Error('Airtable Client ID is required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    console.log('Assigning lead:', leadId, 'to Airtable client:', airtableClientId);

    // Directly update the lead with the Airtable client ID
    const tableName = encodeURIComponent('Qualified Lead Table');
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${leadId}`;

    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { 'Clients': [airtableClientId] }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Airtable API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: airtableUrl,
        airtableClientId
      });

      // Parse error for user-friendly message
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error?.type === 'ROW_DOES_NOT_EXIST') {
          throw new Error('Lead or Client not found in Airtable. Please refresh the page.');
        }
        if (errorJson.error?.type === 'INVALID_REQUEST_UNKNOWN') {
          throw new Error('Invalid Airtable field. Check that the Clients field exists.');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('Please')) {
          throw parseError;
        }
      }

      throw new Error(`Failed to assign lead in Airtable: ${response.status}`);
    }

    const result = await response.json();
    console.log('Successfully assigned lead:', result.id, 'to client:', airtableClientId);

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
