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
      .select('id, email, client_name')
      .not('client_name', 'is', null);

    if (clientsError) throw clientsError;

    // Get Airtable credentials
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Fetch all leads from Airtable
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table`;

    let allRecords: any[] = [];
    let offset: string | undefined;

    do {
      const url = offset
        ? `${airtableUrl}?offset=${offset}`
        : airtableUrl;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);

      const data = await response.json();
      allRecords = [...allRecords, ...data.records];
      offset = data.offset;
    } while (offset);

    // Group leads by client and calculate stats
    const sentimentByClient: Record<string, LeadStats> = {};

    for (const client of clients || []) {
      if (!client.client_name) continue;

      const clientLeads = allRecords.filter(record => {
        const clients = record.fields['Clients'];
        return clients === client.client_name ||
               (Array.isArray(clients) && clients.includes(client.client_name));
      });

      const stats: LeadStats = {
        total: clientLeads.length,
        new: 0,
        approved: 0,
        needsWork: 0,
        rejected: 0,
        booked: 0,
        approvalRate: 0,
        feedbackCount: 0,
        recentFeedback: null,
      };

      let latestFeedbackDate: Date | null = null;

      for (const lead of clientLeads) {
        const status = (lead.fields['Status'] || '').toLowerCase();

        if (status === 'new' || status === 'lead') stats.new++;
        else if (status === 'approved') stats.approved++;
        else if (status === 'needs work') stats.needsWork++;
        else if (status === 'rejected') stats.rejected++;
        else if (status === 'booked') stats.booked++;

        // Check for feedback
        const feedback = lead.fields['Feedback'];
        if (feedback) {
          stats.feedbackCount++;
          const createdTime = new Date(lead.createdTime);
          if (!latestFeedbackDate || createdTime > latestFeedbackDate) {
            latestFeedbackDate = createdTime;
            stats.recentFeedback = feedback.substring(0, 100) + (feedback.length > 100 ? '...' : '');
          }
        }
      }

      // Calculate approval rate (approved + booked out of total processed)
      const processed = stats.approved + stats.booked + stats.rejected;
      if (processed > 0) {
        stats.approvalRate = Math.round(((stats.approved + stats.booked) / processed) * 100);
      }

      sentimentByClient[client.client_name] = stats;
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
