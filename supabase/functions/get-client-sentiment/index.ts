import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadStats {
  total: number;
  new: number;
  approved: number;
  needsWork: number;
  rejected: number;
  booked: number;
  approvalRate: number;
  feedbackCount: number;
  recentFeedback: string | null;
  recentFeedbackLeadId: string | null;
  clientAirtableId: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('User not authenticated');

    // Check if admin
    const { data: isAdmin } = await supabaseClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    // Get Airtable credentials
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // First, fetch all clients from Airtable to build ID -> Name map
    const clientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Clients')}`;
    let clientOffset: string | undefined;
    const clientIdToName: Record<string, string> = {};

    do {
      const url = clientOffset ? `${clientsUrl}?offset=${clientOffset}` : clientsUrl;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${airtableToken}` }
      });

      if (!response.ok) throw new Error(`Failed to fetch clients: ${response.status}`);
      const data = await response.json();

      for (const record of data.records || []) {
        const name = record.fields['Client Name'] || record.fields['Name'] || 'Unknown';
        clientIdToName[record.id] = name;
      }

      clientOffset = data.offset;
    } while (clientOffset);

    // Initialize stats for all clients
    const sentimentByClient: Record<string, LeadStats> = {};
    // Also create a map of client name -> airtable ID
    const clientNameToId: Record<string, string> = {};
    for (const [id, name] of Object.entries(clientIdToName)) {
      clientNameToId[name] = id;
      sentimentByClient[name] = {
        total: 0,
        new: 0,
        approved: 0,
        needsWork: 0,
        rejected: 0,
        booked: 0,
        approvalRate: 0,
        feedbackCount: 0,
        recentFeedback: null,
        recentFeedbackLeadId: null,
        clientAirtableId: id,
      };
    }

    // Fetch leads from Airtable - ONLY the fields we need for speed
    const fields = ['Status', 'Clients', 'Feedback'].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    const baseUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table?${fields}`;

    let offset: string | undefined;
    const latestFeedbackDates: Record<string, Date> = {};

    // Process records as we fetch them (streaming approach)
    do {
      const url = offset ? `${baseUrl}&offset=${offset}` : baseUrl;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
        }
      });

      if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);

      const data = await response.json();

      // Process each record immediately
      for (const record of data.records) {
        const recordClients = record.fields['Clients'] || [];
        const status = (record.fields['Status'] || '').toLowerCase().trim();
        const feedback = record.fields['Feedback'];

        // Clients field contains Airtable record IDs - convert to names
        const clientIds = Array.isArray(recordClients) ? recordClients : [recordClients];

        // Update stats for each client this lead belongs to
        for (const clientId of clientIds) {
          const clientName = clientIdToName[clientId];
          if (!clientName) continue;

          const stats = sentimentByClient[clientName];
          if (!stats) continue;

          stats.total++;

          if (status === 'new' || status === 'lead') stats.new++;
          else if (status === 'approved') stats.approved++;
          else if (status === 'needs work') stats.needsWork++;
          else if (status === 'rejected') stats.rejected++;
          else if (status === 'booked' || status === 'meeting booked') stats.booked++;
          else stats.new++; // Default to new

          if (feedback) {
            stats.feedbackCount++;
            const createdTime = new Date(record.createdTime);
            if (!latestFeedbackDates[clientName] || createdTime > latestFeedbackDates[clientName]) {
              latestFeedbackDates[clientName] = createdTime;
              stats.recentFeedback = feedback.length > 100 ? feedback.substring(0, 100) + '...' : feedback;
              stats.recentFeedbackLeadId = record.id;
            }
          }
        }
      }

      offset = data.offset;
    } while (offset);

    // Calculate approval rates
    for (const stats of Object.values(sentimentByClient)) {
      const processed = stats.approved + stats.booked + stats.rejected;
      if (processed > 0) {
        stats.approvalRate = Math.round(((stats.approved + stats.booked) / processed) * 100);
      }
    }

    return new Response(
      JSON.stringify({ sentiment: sentimentByClient }),
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
