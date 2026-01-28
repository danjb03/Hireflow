import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache clients for 2 minutes
let clientsCache: any[] | null = null;
let clientsCacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

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

    // Check if we should include lead stats
    let includeStats = false;
    try {
      const body = await req.json();
      includeStats = body?.includeStats === true;
    } catch {
      // No body or invalid JSON, that's fine
    }

    const now = Date.now();
    const useCache = !includeStats && clientsCache && (now - clientsCacheTime) < CACHE_TTL;

    if (useCache) {
      return new Response(
        JSON.stringify({ clients: clientsCache }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve linked client table name (in case the table was renamed)
    let clientTableName = 'Clients';
    try {
      const metadataUrl = `https://api.airtable.com/v0/meta/bases/${airtableBaseId}/tables`;
      const metadataResponse = await fetch(metadataUrl, {
        headers: { 'Authorization': `Bearer ${airtableToken}` }
      });
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        const tables = metadata?.tables || [];
        const leadsTable = tables.find((table: any) => table.name === 'Qualified Lead Table');
        const clientsField = (leadsTable?.fields || []).find((field: any) => field.name === 'Clients' && field.type === 'linkedRecord');
        if (clientsField?.options?.linkedTableId) {
          const linkedTable = tables.find((table: any) => table.id === clientsField.options.linkedTableId);
          if (linkedTable?.name) {
            clientTableName = linkedTable.name;
          }
        }
      }
    } catch {
      // Fallback to default table name
    }

    // Only fetch fields we need (retry without fields if Airtable schema changed)
    const fieldsParam = 'fields%5B%5D=Client%20Name&fields%5B%5D=Name&fields%5B%5D=Company%20Name&fields%5B%5D=Company&fields%5B%5D=Email&fields%5B%5D=Status&fields%5B%5D=Phone&fields%5B%5D=Contact%20Person&fields%5B%5D=Leads%20Purchased&fields%5B%5D=Campaign%20Start%20Date&fields%5B%5D=Target%20End%20Date';
    const baseClientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(clientTableName)}`;

    let allClients: any[] = [];
    let offset: string | undefined;
    let useFields = true;

    const pickName = (fields: Record<string, any>): string => {
      return (
        fields['Client Name'] ||
        fields['Name'] ||
        fields['Company Name'] ||
        fields['Company'] ||
        fields['Client'] ||
        fields[Object.keys(fields)[0]] ||
        'Unnamed Client'
      );
    };

    const fetchClientsPage = async () => {
      const clientsUrl = useFields ? `${baseClientsUrl}?${fieldsParam}` : baseClientsUrl;
      const url = offset ? `${clientsUrl}&offset=${offset}` : clientsUrl;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${airtableToken}` }
      });
      return response;
    };

    do {
      const response = await fetchClientsPage();

      if (!response.ok) {
        if (response.status === 422 && useFields) {
          console.warn('Airtable 422 with fields param, retrying without fields filter');
          useFields = false;
          offset = undefined;
          allClients = [];
          continue;
        }
        throw new Error(`Failed to fetch clients: ${response.status}`);
      }

      const data = await response.json();

      const pageClients = (data.records || []).map((record: any) => ({
        id: record.id,
        name: pickName(record.fields || {}),
        email: record.fields['Email'] || null,
        status: record.fields['Status'] || 'Active',
        phone: record.fields['Phone'] || null,
        contactPerson: record.fields['Contact Person'] || null,
        leadsPurchased: record.fields['Leads Purchased'] || 0,
        campaignStartDate: record.fields['Campaign Start Date'] || null,
        targetEndDate: record.fields['Target End Date'] || null,
        leadsDelivered: 0,
        leadsRemaining: 0,
        leadStats: null,
        firstLeadDate: null
      }));

      allClients.push(...pageClients);
      offset = data.offset;
    } while (offset);

    // If includeStats, fetch lead counts
    if (includeStats) {
      // Only fetch needed fields for counting
      const leadsUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table?fields%5B%5D=Clients&fields%5B%5D=Status&fields%5B%5D=Date%20Created`;
      let allLeads: any[] = [];
      let leadsOffset: string | undefined;

      do {
        const url = leadsOffset ? `${leadsUrl}&offset=${leadsOffset}` : leadsUrl;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${airtableToken}` }
        });

        if (!response.ok) break;

        const data = await response.json();
        allLeads.push(...(data.records || []));
        leadsOffset = data.offset;
      } while (leadsOffset);

      // Build stats map
      const clientLeadStats: Record<string, any> = {};

      for (const lead of allLeads) {
        const clientIds = lead.fields['Clients'] || [];
        const status = (lead.fields['Status'] || 'New').toLowerCase().trim();
        const dateCreated = lead.fields['Date Created'] || null;

        for (const clientId of clientIds) {
          if (!clientLeadStats[clientId]) {
            clientLeadStats[clientId] = {
              total: 0, new: 0, approved: 0, rejected: 0, needsWork: 0, booked: 0, firstLeadDate: null
            };
          }

          const stats = clientLeadStats[clientId];
          stats.total++;

          if (dateCreated && (!stats.firstLeadDate || new Date(dateCreated) < new Date(stats.firstLeadDate))) {
            stats.firstLeadDate = dateCreated;
          }

          if (status === 'booked' || status === 'meeting booked') stats.booked++;
          else if (status === 'approved') stats.approved++;
          else if (status === 'rejected') stats.rejected++;
          else if (status === 'needs work') stats.needsWork++;
          else stats.new++;
        }
      }

      // Attach stats to clients
      for (const client of allClients) {
        const stats = clientLeadStats[client.id];
        if (stats) {
          client.leadsDelivered = stats.approved + stats.booked;
          client.leadsRemaining = Math.max(0, (client.leadsPurchased || 0) - client.leadsDelivered);
          client.leadStats = stats;
          client.firstLeadDate = stats.firstLeadDate;
          if (!client.campaignStartDate && stats.firstLeadDate) {
            client.campaignStartDate = stats.firstLeadDate;
          }
        } else {
          client.leadsDelivered = 0;
          client.leadsRemaining = client.leadsPurchased || 0;
          client.leadStats = { total: 0, new: 0, approved: 0, rejected: 0, needsWork: 0, booked: 0, firstLeadDate: null };
        }
      }
    }

    // Update cache (only for non-stats requests)
    if (!includeStats) {
      clientsCache = allClients;
      clientsCacheTime = now;
    }

    return new Response(
      JSON.stringify({ clients: allClients }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Airtable clients:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
