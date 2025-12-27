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

    // Check if we should include lead stats
    let includeStats = false;
    try {
      const body = await req.json();
      includeStats = body?.includeStats === true;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Fetch actual client records from Clients table
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

      // Map clients with more fields
      const pageClients = (data.records || []).map((record: any) => ({
        id: record.id,
        name: record.fields['Client Name'] || record.fields['Name'] || 'Unnamed Client',
        email: record.fields['Email'] || null,
        status: record.fields['Status'] || 'Active',
        phone: record.fields['Phone'] || null,
        companyName: record.fields['Company Name'] || null,
        contactPerson: record.fields['Contact Person'] || null,
        leadsPurchased: record.fields['Leads Purchased'] || 0,
        // Stats will be populated below if includeStats is true
        leadsDelivered: 0,
        leadsRemaining: 0,
        leadStats: null
      }));

      allClients = allClients.concat(pageClients);
      offset = data.offset;
    } while (offset);

    // If includeStats is true, fetch lead counts for each client
    if (includeStats) {
      // Fetch all leads to count per client
      const leadsTableName = encodeURIComponent('Qualified Lead Table');
      let leadsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${leadsTableName}`;
      let allLeads: any[] = [];
      let leadsOffset: string | undefined = undefined;

      do {
        const urlWithOffset = leadsOffset
          ? `${leadsUrl}?offset=${leadsOffset}&fields%5B%5D=Clients&fields%5B%5D=Status&fields%5B%5D=Client%20Feedback`
          : `${leadsUrl}?fields%5B%5D=Clients&fields%5B%5D=Status&fields%5B%5D=Client%20Feedback`;

        const response = await fetch(urlWithOffset, {
          headers: {
            'Authorization': `Bearer ${airtableToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          allLeads = allLeads.concat(data.records || []);
          leadsOffset = data.offset;
        } else {
          console.error('Failed to fetch leads for stats');
          break;
        }
      } while (leadsOffset);

      // Build a map of client ID -> lead stats
      const clientLeadStats: Record<string, {
        total: number;
        new: number;
        approved: number;
        rejected: number;
        needsWork: number;
        booked: number;
      }> = {};

      for (const lead of allLeads) {
        const clientIds = lead.fields['Clients'] || [];
        const status = lead.fields['Status'] || 'New';
        const feedback = lead.fields['Client Feedback'] || '';

        for (const clientId of clientIds) {
          if (!clientLeadStats[clientId]) {
            clientLeadStats[clientId] = {
              total: 0,
              new: 0,
              approved: 0,
              rejected: 0,
              needsWork: 0,
              booked: 0
            };
          }

          clientLeadStats[clientId].total++;

          // Categorize by status/feedback
          const statusLower = status.toLowerCase();
          const feedbackLower = feedback.toLowerCase();

          if (statusLower === 'booked' || statusLower === 'meeting booked') {
            clientLeadStats[clientId].booked++;
          } else if (feedbackLower.includes('approved') || feedbackLower.includes('good')) {
            clientLeadStats[clientId].approved++;
          } else if (feedbackLower.includes('rejected') || feedbackLower.includes('not interested')) {
            clientLeadStats[clientId].rejected++;
          } else if (feedbackLower.includes('needs work') || feedbackLower.includes('improve')) {
            clientLeadStats[clientId].needsWork++;
          } else {
            clientLeadStats[clientId].new++;
          }
        }
      }

      // Attach stats to clients
      for (const client of allClients) {
        const stats = clientLeadStats[client.id];
        if (stats) {
          client.leadsDelivered = stats.total;
          client.leadsRemaining = Math.max(0, (client.leadsPurchased || 0) - stats.total);
          client.leadStats = stats;
        } else {
          client.leadsDelivered = 0;
          client.leadsRemaining = client.leadsPurchased || 0;
          client.leadStats = { total: 0, new: 0, approved: 0, rejected: 0, needsWork: 0, booked: 0 };
        }
      }
    }

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

