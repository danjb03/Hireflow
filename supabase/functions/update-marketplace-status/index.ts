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

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    const { leadId, marketplaceStatus } = await req.json();

    if (!leadId) throw new Error('Lead ID is required');
    if (!marketplaceStatus) throw new Error('Marketplace status is required');

    // Validate status
    const rawStatus = String(marketplaceStatus ?? '');
    const cleanedStatus = rawStatus.trim();
    const validStatuses = ['Pending Review', 'Active', 'Sold', 'Hidden', 'Hidden '];
    if (!validStatuses.includes(cleanedStatus) && !validStatuses.includes(rawStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    const airtableLeadsTable = Deno.env.get('AIRTABLE_LEADS_TABLE') || 'Qualified Lead Table';
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Update Airtable record
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableLeadsTable)}/${leadId}`;

    let statusFieldName = Deno.env.get('AIRTABLE_MARKETPLACE_STATUS_FIELD') || '';
    const statusFieldId = Deno.env.get('AIRTABLE_MARKETPLACE_STATUS_FIELD_ID') || '';

    if (!statusFieldName && statusFieldId) {
      try {
        const metadataUrl = `https://api.airtable.com/v0/meta/bases/${airtableBaseId}/tables`;
        const metadataResponse = await fetch(metadataUrl, {
          headers: { 'Authorization': `Bearer ${airtableToken}` }
        });
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          const tables = metadata?.tables || [];
          const leadsTable = tables.find((table: any) => table.name === airtableLeadsTable);
          const field = (leadsTable?.fields || []).find((f: any) => f.id === statusFieldId);
          if (field?.name) {
            statusFieldName = field.name;
          }
        }
      } catch {
        // ignore and fall back
      }
    }

    const statusFieldCandidates = [
      statusFieldName,
      'Marketplace Status',
      'marketplace status',
      'Marketplace status',
    ].filter(Boolean);

    let response: Response | null = null;
    let lastErrorText = '';

    // If the UI passes "Hidden" but Airtable option has trailing space, map it
    const statusToSend = cleanedStatus === 'Hidden' ? 'Hidden ' : cleanedStatus || rawStatus;

    for (const fieldName of statusFieldCandidates) {
      response = await fetch(airtableUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            [fieldName as string]: statusToSend
          },
          typecast: true
        })
      });

      if (response.ok) break;

      lastErrorText = await response.text();
      if (!lastErrorText.includes('UNKNOWN_FIELD_NAME')) {
        break;
      }
    }

    if (!response || !response.ok) {
      const errorText = lastErrorText || (response ? await response.text() : '');
      console.error('Airtable error:', response?.status, errorText);
      throw new Error(`Airtable error (${response?.status ?? 'unknown'}): ${errorText}`);
    }

    const updatedRecord = await response.json();

    return new Response(
      JSON.stringify({ success: true, record: updatedRecord }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating marketplace status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
