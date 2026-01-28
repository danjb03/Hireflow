import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache client names for 5 minutes
let clientNameCache: Map<string, string> | null = null;
let clientCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id,
    });

    if (roleError || !isAdmin) {
      throw new Error('Admin access required');
    }

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const clientFilter = url.searchParams.get('client');
    const searchTerm = url.searchParams.get('search');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Build filter formula
    let filterParts: string[] = [];

    if (statusFilter === 'Not Qualified') {
      filterParts.push(`{Status} = 'Not Qualified'`);
    } else {
      filterParts.push(`{Status} != 'Not Qualified'`);
      if (statusFilter) {
        filterParts.push(`{Status} = '${statusFilter.replace(/'/g, "\\'")}'`);
      }
    }

    if (clientFilter) {
      if (clientFilter === 'unassigned') {
        filterParts.push(`OR({Clients} = '', {Clients} = BLANK())`);
      } else {
        filterParts.push(`{Clients} = '${clientFilter.replace(/'/g, "\\'")}'`);
      }
    }

    if (searchTerm) {
      filterParts.push(`SEARCH(LOWER('${searchTerm.replace(/'/g, "\\'")}'), LOWER({Company Name})) > 0`);
    }

    const filterFormula = filterParts.length > 0 ? `AND(${filterParts.join(', ')})` : '';

    // Only fetch fields we need - significantly reduces response size
    const neededFields = [
      'Company Name', 'Status', 'Clients', 'Contact Name', 'Email', 'Phone',
      'Company Website', 'Titles of Roles', 'Date Created', 'AI Summary'
    ];
    const fieldsParam = neededFields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');

    const tableName = 'Qualified Lead Table';
    let baseUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(tableName)}?${fieldsParam}`;
    if (filterFormula) {
      baseUrl += `&filterByFormula=${encodeURIComponent(filterFormula)}`;
    }
    // Sort by created time descending for most recent first
    baseUrl += `&sort%5B0%5D%5Bfield%5D=Date%20Created&sort%5B0%5D%5Bdirection%5D=desc`;

    // Fetch client names in parallel with first batch of leads (or use cache)
    const now = Date.now();
    const needsClientCache = !clientNameCache || (now - clientCacheTime) > CACHE_TTL;

    const [leadsData, clientMap] = await Promise.all([
      fetchAllLeads(baseUrl, airtableToken),
      needsClientCache
        ? fetchClientNames(airtableBaseId, airtableToken)
        : Promise.resolve(clientNameCache!)
    ]);

    // Update cache
    if (needsClientCache) {
      clientNameCache = clientMap;
      clientCacheTime = now;
    }

    // Transform leads with client names
    const leads = leadsData.map((record: any) => {
      const fields = record.fields;

      // Resolve client name
      let assignedClient = 'Unassigned';
      const clientField = fields['Clients'];

      if (clientField) {
        if (Array.isArray(clientField) && clientField.length > 0) {
          const clientId = clientField[0];
          assignedClient = clientMap.get(clientId) || 'Unknown Client';
        } else if (typeof clientField === 'string') {
          if (clientField.startsWith('rec')) {
            assignedClient = clientMap.get(clientField) || 'Unknown Client';
          } else {
            assignedClient = clientField;
          }
        }
      }

      return {
        id: record.id,
        companyName: fields['Company Name'] || '',
        status: fields['Status'] || 'New',
        assignedClient,
        assignedClientId: Array.isArray(clientField) ? clientField[0] : null,
        contactName: fields['Contact Name'] || null,
        email: fields['Email'] || '',
        phone: fields['Phone'] ? String(fields['Phone']) : '',
        companyWebsite: fields['Company Website'] || '',
        titlesOfRoles: fields['Titles of Roles'] || null,
        aiSummary: normalizeAiSummary(fields['AI Summary']),
        dateCreated: fields['Date Created'] || record.createdTime,
      };
    });

    return new Response(
      JSON.stringify({ leads }),
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

// Fetch all leads with pagination (parallel batches)
async function fetchAllLeads(baseUrl: string, token: string): Promise<any[]> {
  const allRecords: any[] = [];
  let offset: string | undefined;

  // Fetch first page
  const firstResponse = await fetch(baseUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!firstResponse.ok) {
    throw new Error(`Airtable API error: ${firstResponse.status}`);
  }

  const firstData = await firstResponse.json();
  allRecords.push(...(firstData.records || []));
  offset = firstData.offset;

  // Fetch remaining pages
  while (offset) {
    const response = await fetch(`${baseUrl}&offset=${offset}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) break;

    const data = await response.json();
    allRecords.push(...(data.records || []));
    offset = data.offset;
  }

  return allRecords;
}

// Fetch all client names at once
async function fetchClientNames(baseId: string, token: string): Promise<Map<string, string>> {
  const clientMap = new Map<string, string>();
  const clientsUrl = `https://api.airtable.com/v0/${baseId}/Clients?fields%5B%5D=Client%20Name&fields%5B%5D=Name`;

  let offset: string | undefined;

  do {
    const url = offset ? `${clientsUrl}&offset=${offset}` : clientsUrl;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) break;

    const data = await response.json();
    for (const record of data.records || []) {
      const name = record.fields['Client Name'] || record.fields['Name'] || '';
      if (name) {
        clientMap.set(record.id, name);
      }
    }
    offset = data.offset;
  } while (offset);

  return clientMap;
}

function normalizeAiSummary(summary: any): string | null {
  if (!summary) return null;
  if (typeof summary === 'string') return summary;
  if (typeof summary === 'object' && summary.value) return String(summary.value);
  return null;
}
