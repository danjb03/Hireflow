import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Get all clients from profiles
    const { data: clients, error: clientsError } = await supabaseClient
      .from('profiles')
      .select('client_name')
      .not('client_name', 'is', null);

    if (clientsError) throw clientsError;

    // Build a set of client names for fast lookup
    const clientNames = new Set<string>();
    for (const client of clients || []) {
      if (client.client_name) clientNames.add(client.client_name);
    }

    // Initialize stats for all clients
    const sentimentByClient: Record<string, LeadStats> = {};
    for (const name of clientNames) {
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
      };
    }

    // Get Airtable credentials
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

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
        const recordClients = record.fields['Clients'];
        const status = (record.fields['Status'] || '').toLowerCase();
        const feedback = record.fields['Feedback'];

        // Find which client(s) this lead belongs to
        const matchingClients: string[] = [];
        if (typeof recordClients === 'string' && clientNames.has(recordClients)) {
          matchingClients.push(recordClients);
        } else if (Array.isArray(recordClients)) {
          for (const c of recordClients) {
            if (clientNames.has(c)) matchingClients.push(c);
          }
        }

        // Update stats for each matching client
        for (const clientName of matchingClients) {
          const stats = sentimentByClient[clientName];
          stats.total++;

          if (status === 'new' || status === 'lead') stats.new++;
          else if (status === 'approved') stats.approved++;
          else if (status === 'needs work') stats.needsWork++;
          else if (status === 'rejected') stats.rejected++;
          else if (status === 'booked') stats.booked++;

          if (feedback) {
            stats.feedbackCount++;
            const createdTime = new Date(record.createdTime);
            if (!latestFeedbackDates[clientName] || createdTime > latestFeedbackDates[clientName]) {
              latestFeedbackDates[clientName] = createdTime;
              stats.recentFeedback = feedback.length > 100 ? feedback.substring(0, 100) + '...' : feedback;
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
