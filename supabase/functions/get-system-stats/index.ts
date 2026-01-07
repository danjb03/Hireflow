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

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    console.log('Fetching stats from Airtable base:', airtableBaseId);

    // Get total clients from Airtable (active clients)
    const clientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Clients')}`;
    const clientsResponse = await fetch(clientsUrl, {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      }
    });

    let totalClients = 0;
    if (clientsResponse.ok) {
      const clientsData = await clientsResponse.json();
      // Count active clients (exclude Inactive status)
      totalClients = (clientsData.records || []).filter((c: any) => {
        const status = c.fields?.Status || '';
        return status !== 'Inactive' && status !== 'Not Active';
      }).length;
    }

    // Fetch all leads from Airtable
    const tableName = 'Qualified Lead Table';
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(tableName)}`;
    console.log('Requesting URL:', airtableUrl);
    
    const response = await fetch(airtableUrl, {
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
        baseId: airtableBaseId,
        tableName: tableName
      });
      throw new Error(`Airtable API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const records = data.records || [];

    const totalLeads = records.length;
    const statusCounts: Record<string, number> = {
      New: 0,
      Lead: 0,
      Approved: 0,
      Rejected: 0,
      'Needs Work': 0,
      Booked: 0,
      Unknown: 0,
    };

    // Count by status (normalize casing)
    records.forEach((record: any) => {
      const status = (record.fields['Status'] || '').trim();
      const statusLower = status.toLowerCase();

      if (statusLower === 'new') statusCounts.New++;
      else if (statusLower === 'lead') statusCounts.Lead++;
      else if (statusLower === 'approved') statusCounts.Approved++;
      else if (statusLower === 'rejected') statusCounts.Rejected++;
      else if (statusLower === 'needs work') statusCounts['Needs Work']++;
      else if (statusLower === 'booked' || statusLower === 'meeting booked') statusCounts.Booked++;
      else statusCounts.Unknown++;
    });

    return new Response(
      JSON.stringify({
        totalClients,
        totalLeads,
        statusBreakdown: statusCounts,
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
