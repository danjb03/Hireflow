const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseResult {
  timeOnDialer: { hours: number; minutes: number };
  callsMade: number;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl } = await req.json();

    if (!imageBase64 && !imageUrl) {
      throw new Error('Either imageBase64 or imageUrl is required');
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Prepare image content for Claude Vision
    let imageContent: any;

    if (imageBase64) {
      // Detect media type from base64 header or default to png
      let mediaType = 'image/png';
      let base64Data = imageBase64;

      if (imageBase64.startsWith('data:')) {
        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mediaType = matches[1];
          base64Data = matches[2];
        }
      }

      imageContent = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data
        }
      };
    } else {
      imageContent = {
        type: 'image',
        source: {
          type: 'url',
          url: imageUrl
        }
      };
    }

    // Call Claude Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              imageContent,
              {
                type: 'text',
                text: `Analyze this Close.com dialer screenshot and extract the following metrics:
1. Total time on dialer (in hours and minutes)
2. Number of calls made

Look for text like "Talk Time", "Total Time", "Duration", "Calls Made", "Total Calls", or similar metrics.

Return ONLY a valid JSON object with this exact structure:
{
  "timeOnDialer": { "hours": <number>, "minutes": <number> },
  "callsMade": <number>,
  "confidence": <number between 0 and 1>
}

If you cannot find specific values, use 0 for numbers and a low confidence score.
The confidence should reflect how clearly you could read and extract the values.`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error('Failed to analyze screenshot with AI');
    }

    const aiData = await response.json();
    const aiContent = aiData.content?.[0]?.text;

    if (!aiContent) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let parsed: ParseResult;
    try {
      // Clean the response in case it has markdown code blocks
      const cleanedContent = aiContent.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      // Return default values with low confidence
      parsed = {
        timeOnDialer: { hours: 0, minutes: 0 },
        callsMade: 0,
        confidence: 0.1
      };
    }

    // Calculate total minutes
    const totalMinutes = (parsed.timeOnDialer.hours * 60) + parsed.timeOnDialer.minutes;

    return new Response(
      JSON.stringify({
        success: true,
        extracted: {
          timeOnDialerMinutes: totalMinutes,
          timeOnDialerHours: parsed.timeOnDialer.hours,
          timeOnDialerMins: parsed.timeOnDialer.minutes,
          callsMade: parsed.callsMade,
          confidence: parsed.confidence
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing screenshot:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
