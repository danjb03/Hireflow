import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthAnalysis {
  score: number; // 1-10
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  summary: string;
  concerns: string[];
  positives: string[];
  recommendation: string;
}

interface ClientHealthResult {
  clientName: string;
  health: HealthAnalysis;
  feedbackCount: number;
  leadsAnalyzed: number;
  analyzedAt: string;
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

    // Get optional clientName filter from request body
    let targetClient: string | null = null;
    try {
      const body = await req.json();
      targetClient = body.clientName || null;
    } catch {
      // No body or invalid JSON - analyze all clients
    }

    // Get all clients from profiles
    const { data: clients, error: clientsError } = await supabaseClient
      .from('profiles')
      .select('client_name')
      .not('client_name', 'is', null);

    if (clientsError) throw clientsError;

    const clientNames = new Set<string>();
    for (const client of clients || []) {
      if (client.client_name) {
        if (targetClient && client.client_name !== targetClient) continue;
        clientNames.add(client.client_name);
      }
    }

    if (clientNames.size === 0) {
      return new Response(
        JSON.stringify({ results: [], message: 'No clients found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Airtable credentials
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Get Anthropic API key
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('Anthropic API key not configured. Please add ANTHROPIC_API_KEY to Supabase secrets.');

    // Collect feedback per client
    const feedbackByClient: Record<string, { feedback: string; status: string; company: string }[]> = {};
    for (const name of clientNames) {
      feedbackByClient[name] = [];
    }

    // Fetch leads from Airtable
    const fields = ['Status', 'Clients', 'Feedback', 'Company Name'].map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&');
    const baseUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table?${fields}`;

    let offset: string | undefined;

    do {
      const url = offset ? `${baseUrl}&offset=${offset}` : baseUrl;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${airtableToken}` }
      });

      if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);
      const data = await response.json();

      for (const record of data.records) {
        const recordClients = record.fields['Clients'];
        const feedback = record.fields['Feedback'];
        const status = record.fields['Status'] || '';
        const company = record.fields['Company Name'] || 'Unknown';

        if (!feedback) continue; // Skip leads without feedback

        // Find matching clients
        const matchingClients: string[] = [];
        if (typeof recordClients === 'string' && clientNames.has(recordClients)) {
          matchingClients.push(recordClients);
        } else if (Array.isArray(recordClients)) {
          for (const c of recordClients) {
            if (clientNames.has(c)) matchingClients.push(c);
          }
        }

        for (const clientName of matchingClients) {
          feedbackByClient[clientName].push({ feedback, status, company });
        }
      }

      offset = data.offset;
    } while (offset);

    // Analyze each client's feedback with AI
    const results: ClientHealthResult[] = [];

    for (const [clientName, feedbackItems] of Object.entries(feedbackByClient)) {
      if (feedbackItems.length === 0) {
        // No feedback - give neutral score
        results.push({
          clientName,
          health: {
            score: 5,
            sentiment: 'neutral',
            summary: 'No feedback has been provided by this client yet.',
            concerns: [],
            positives: [],
            recommendation: 'Encourage the client to provide feedback on leads to better understand their satisfaction.'
          },
          feedbackCount: 0,
          leadsAnalyzed: 0,
          analyzedAt: new Date().toISOString()
        });
        continue;
      }

      // Prepare feedback text for AI
      const feedbackText = feedbackItems.map((item, i) =>
        `Lead ${i + 1} (${item.company}, Status: ${item.status}):\n"${item.feedback}"`
      ).join('\n\n');

      // Call Claude to analyze
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          system: `You are analyzing client feedback on recruitment leads to determine their overall satisfaction and health score.

Analyze the feedback and return a JSON object with:
- score: A number from 1-10 (1 = extremely unhappy, 5 = neutral, 10 = extremely happy)
- sentiment: One of "very_negative", "negative", "neutral", "positive", "very_positive"
- summary: A 1-2 sentence summary of how the client feels about the leads overall
- concerns: Array of specific concerns or complaints mentioned (max 3)
- positives: Array of positive things mentioned (max 3)
- recommendation: A specific actionable recommendation for improving this client's experience

Be objective and look for patterns across all feedback. Consider tone, specific complaints, praise, and overall satisfaction signals.

Return ONLY valid JSON, no other text.`,
          messages: [
            {
              role: 'user',
              content: `Analyze this client's feedback on ${feedbackItems.length} leads:\n\n${feedbackText}`
            }
          ]
        })
      });

      if (!aiResponse.ok) {
        console.error('Claude error:', await aiResponse.text());
        throw new Error('Failed to analyze feedback with AI');
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.content?.[0]?.text;

      if (!aiContent) {
        throw new Error('No response from AI');
      }

      // Parse AI response
      let health: HealthAnalysis;
      try {
        // Clean the response in case it has markdown code blocks
        const cleanedContent = aiContent.replace(/```json\n?|\n?```/g, '').trim();
        health = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiContent);
        health = {
          score: 5,
          sentiment: 'neutral',
          summary: 'Unable to analyze feedback automatically.',
          concerns: [],
          positives: [],
          recommendation: 'Manual review of client feedback recommended.'
        };
      }

      results.push({
        clientName,
        health,
        feedbackCount: feedbackItems.length,
        leadsAnalyzed: feedbackItems.length,
        analyzedAt: new Date().toISOString()
      });
    }

    // Sort by score (lowest first - these need attention)
    results.sort((a, b) => a.health.score - b.health.score);

    return new Response(
      JSON.stringify({ results }),
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
