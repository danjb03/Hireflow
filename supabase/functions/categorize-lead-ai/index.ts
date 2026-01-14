const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract Close lead ID from URL
function extractCloseLeadId(url: string): string | null {
  const match = url.match(/lead\/(lead_[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Retry wrapper for API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

// Fetch transcript from Close.com
async function fetchCloseTranscript(closeLeadId: string, apiKey: string): Promise<string> {
  const authHeader = 'Basic ' + btoa(apiKey + ':');

  // Fetch call activities for this lead
  const response = await fetch(
    `https://api.close.com/api/v1/activity/call/?lead_id=${closeLeadId}`,
    {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Close.com API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const calls = data.data || [];

  if (calls.length === 0) {
    return '';
  }

  // Sort by date (most recent first) and extract transcripts/notes
  const sortedCalls = calls.sort((a: any, b: any) =>
    new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
  );

  const parts: string[] = [];

  for (const call of sortedCalls) {
    const dateStr = new Date(call.date_created).toLocaleString();

    if (call.transcript?.text) {
      parts.push(`[Call on ${dateStr}]\n${call.transcript.text}`);
    } else if (call.note) {
      parts.push(`[Call notes on ${dateStr}]\n${call.note}`);
    }
  }

  return parts.join('\n\n---\n\n');
}

// Analyze transcript with Claude
async function analyzeWithClaude(transcript: string, apiKey: string): Promise<{
  suggestedStatus: string;
  confidence: number;
  reasoning: string;
}> {
  const prompt = `You are an expert lead qualification analyst for a B2B recruitment lead generation company. Your task is to analyze call transcripts and suggest the appropriate status for a lead.

CONTEXT:
- This is a lead generation service for recruitment agencies
- Leads are businesses that may need recruitment services
- The goal is to identify companies genuinely interested in hiring through a recruiter

STATUS OPTIONS:
1. Approved - The lead shows clear interest and is ready to work with a recruiter
2. Needs Work - The lead shows some potential but needs follow-up or clarification
3. Rejected - The lead is not suitable (not interested, wrong fit, spam, etc.)

CRITERIA FOR EACH STATUS:

Approved (High confidence):
- Explicitly agreed to work with a recruiter
- Confirmed callback appointment
- Discussed specific hiring needs
- Decision maker or has authority to hire
- Expressed urgency in hiring

Needs Work (Medium confidence):
- Showed interest but didn't commit
- Requested more information
- Mentioned future hiring needs
- Needs decision from another person
- Callback scheduled but tentative

Rejected (Clear red flags):
- Explicitly said not interested
- Wrong contact (not decision maker, no hiring authority)
- Company not actively hiring
- Already working with recruiters
- Spam/test/invalid lead

TRANSCRIPT TO ANALYZE:
${transcript}

RESPOND IN THIS EXACT JSON FORMAT (no markdown, just raw JSON):
{
  "suggestedStatus": "Approved" or "Needs Work" or "Rejected",
  "confidence": <number 0-100>,
  "reasoning": "<2-3 sentence explanation of why this status was suggested>"
}

Be conservative in your assessment. When in doubt, choose "Needs Work" to allow human review.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const claudeData = await response.json();
  const responseText = claudeData.content[0]?.text || '';

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain valid JSON');
  }

  const aiResult = JSON.parse(jsonMatch[0]);

  return {
    suggestedStatus: aiResult.suggestedStatus || 'Needs Work',
    confidence: aiResult.confidence || 50,
    reasoning: aiResult.reasoning || 'Unable to determine reasoning',
  };
}

// Update Airtable with AI results
async function updateAirtableWithAI(
  leadId: string,
  closeLeadId: string,
  aiResult: { suggestedStatus: string; confidence: number; reasoning: string },
  airtableToken: string,
  airtableBaseId: string
): Promise<void> {
  const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table/${leadId}`;

  const response = await fetch(airtableUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${airtableToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        'AI Suggested Status': aiResult.suggestedStatus,
        'AI Reasoning': aiResult.reasoning,
        'AI Confidence': aiResult.confidence,
        'AI Analyzed At': new Date().toISOString(),
        'Close Lead ID': closeLeadId,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airtable update error: ${response.status} - ${errorText}`);
  }
}

// Store error in Airtable
async function storeErrorInAirtable(
  leadId: string,
  errorMessage: string,
  airtableToken: string,
  airtableBaseId: string
): Promise<void> {
  try {
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table/${leadId}`;

    await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'AI Reasoning': `Analysis failed: ${errorMessage}`,
          'AI Analyzed At': new Date().toISOString(),
        }
      })
    });
  } catch (err) {
    console.error('Failed to store error in Airtable:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get environment variables
  const closeApiKey = Deno.env.get('CLOSE_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
  const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

  let leadId: string | undefined;

  try {
    // Parse request
    const body = await req.json();
    leadId = body.leadId;
    const closeLinkUrl = body.closeLinkUrl;

    if (!leadId) throw new Error('Lead ID is required');
    if (!closeLinkUrl) throw new Error('Close Link URL is required');

    console.log('Categorizing lead:', leadId, 'from Close URL:', closeLinkUrl);

    // Validate environment variables
    if (!closeApiKey) throw new Error('CLOSE_API_KEY not configured');
    if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Extract Close lead ID from URL
    const closeLeadId = extractCloseLeadId(closeLinkUrl);
    if (!closeLeadId) {
      throw new Error('Invalid Close.com URL format. Expected: https://app.close.com/lead/lead_xxx/');
    }

    console.log('Extracted Close lead ID:', closeLeadId);

    // Fetch transcript from Close.com with retry
    const transcript = await withRetry(() =>
      fetchCloseTranscript(closeLeadId, closeApiKey)
    );

    if (!transcript) {
      // No transcript available - store this info and return
      await updateAirtableWithAI(
        leadId,
        closeLeadId,
        {
          suggestedStatus: 'Needs Work',
          confidence: 0,
          reasoning: 'No call transcript or notes available in Close.com. Manual review required.',
        },
        airtableToken,
        airtableBaseId
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No transcript available',
          suggestion: { suggestedStatus: 'Needs Work', confidence: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetched transcript, length:', transcript.length);

    // Analyze with Claude
    const aiResult = await withRetry(() =>
      analyzeWithClaude(transcript, anthropicApiKey)
    );

    console.log('AI analysis result:', aiResult);

    // Update Airtable with results
    await updateAirtableWithAI(leadId, closeLeadId, aiResult, airtableToken, airtableBaseId);

    console.log('Successfully updated Airtable with AI suggestion');

    return new Response(
      JSON.stringify({
        success: true,
        suggestion: aiResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error categorizing lead:', error);

    // Try to store error in Airtable if we have the lead ID
    if (leadId && airtableToken && airtableBaseId) {
      await storeErrorInAirtable(
        leadId,
        error instanceof Error ? error.message : 'Unknown error',
        airtableToken,
        airtableBaseId
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
