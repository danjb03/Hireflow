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

    // Fetch table schema to get the Client field options
    const metadataUrl = `https://api.airtable.com/v0/meta/bases/${airtableBaseId}/tables`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
      },
    });

    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch Airtable metadata: ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json();
    
    // Find the "Qualified Lead Table"
    const leadTable = metadata.tables.find((table: any) => 
      table.name === 'Qualified Lead Table'
    );

    if (!leadTable) {
      throw new Error('Qualified Lead Table not found');
    }

    // Find the Client field
    const clientField = leadTable.fields.find((field: any) => 
      field.name === 'Client'
    );

    if (!clientField) {
      throw new Error('Client field not found');
    }

    // Extract the dropdown options
    const clientOptions = clientField.options?.choices?.map((choice: any) => choice.name) || [];

    return new Response(
      JSON.stringify({ options: clientOptions }),
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
