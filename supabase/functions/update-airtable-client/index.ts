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
    const { clientId, fields } = body;

    if (!clientId) {
      throw new Error('Client ID is required');
    }

    if (!fields || Object.keys(fields).length === 0) {
      throw new Error('At least one field is required');
    }

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Map frontend field names to Airtable field names
    const airtableFields: Record<string, any> = {};

    if (fields.leadsPurchased !== undefined) {
      airtableFields['Leads Purchased'] = Number(fields.leadsPurchased) || 0;
    }
    if (fields.campaignStartDate !== undefined) {
      // Airtable expects ISO date string or null
      airtableFields['Campaign Start Date'] = fields.campaignStartDate || null;
    }
    if (fields.targetEndDate !== undefined) {
      airtableFields['Target End Date'] = fields.targetEndDate || null;
    }
    if (fields.status !== undefined) {
      airtableFields['Status'] = fields.status;
    }

    console.log('Updating Airtable client:', clientId, 'with fields:', Object.keys(airtableFields));

    // Update the record in Airtable
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Clients/${clientId}`;

    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: airtableFields })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable error:', response.status, errorText);
      throw new Error(`Airtable error: ${response.status} - ${errorText}`);
    }

    const updatedRecord = await response.json();
    console.log('Updated Airtable client:', updatedRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        client: {
          id: updatedRecord.id,
          leadsPurchased: updatedRecord.fields['Leads Purchased'] || 0,
          campaignStartDate: updatedRecord.fields['Campaign Start Date'] || null,
          targetEndDate: updatedRecord.fields['Target End Date'] || null,
          status: updatedRecord.fields['Status'] || null,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating Airtable client:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
