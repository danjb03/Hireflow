import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate write-up using Claude
async function generateWriteup(leadData: {
  industry: string | null;
  industry2: string | null;
  companySize: string | null;
  titlesOfRoles: string | null;
  companyDescription: string | null;
  region: string | null;
  internalNotes: string | null;
}, apiKey: string): Promise<string> {
  const prompt = `You are a professional copywriter for a B2B recruitment lead generation marketplace. Your task is to write a compelling, anonymized description of a hiring company for potential recruitment clients.

LEAD INFORMATION:
- Industry: ${leadData.industry || 'Not specified'}${leadData.industry2 ? `, ${leadData.industry2}` : ''}
- Company Size: ${leadData.companySize || 'Not specified'}
- Location: ${leadData.region || 'Not specified'}
- Roles Hiring: ${leadData.titlesOfRoles || 'Not specified'}
- Company Description: ${leadData.companyDescription || 'Not available'}
- Additional Context: ${leadData.internalNotes || 'None'}

REQUIREMENTS:
1. Write 2-3 sentences that would entice a recruitment agency to express interest
2. DO NOT include any company names, contact details, or specific identifying information
3. Highlight the hiring opportunity and growth potential
4. Use professional, engaging language
5. Focus on the value proposition for recruiters

Write ONLY the description, no headers or explanations.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
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
  const writeup = claudeData.content[0]?.text || '';

  return writeup.trim();
}

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

    const { leadId } = await req.json();
    if (!leadId) throw new Error('Lead ID is required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');
    if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    // Fetch lead data from Airtable
    const leadUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table/${leadId}`;
    const leadResponse = await fetch(leadUrl, {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!leadResponse.ok) {
      throw new Error(`Failed to fetch lead: ${leadResponse.status}`);
    }

    const leadRecord = await leadResponse.json();
    const fields = leadRecord.fields;

    // Extract region from address
    const address = Array.isArray(fields['Address'])
      ? fields['Address'].join(', ')
      : (fields['Address'] || '');
    const region = extractRegion(address, fields['Country']);

    // Generate write-up
    const writeup = await generateWriteup({
      industry: fields['Industry'] || null,
      industry2: fields['Industry 2'] || null,
      companySize: fields['Company Size'] || fields['Employee Count'] || null,
      titlesOfRoles: fields['Titles of Roles'] || null,
      companyDescription: fields['Company Description'] || null,
      region: region,
      internalNotes: fields['Internal Notes'] || null,
    }, anthropicApiKey);

    // Update Airtable with the write-up
    const updateUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table/${leadId}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Marketplace Write-up': writeup
        }
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update lead: ${updateResponse.status} - ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true, writeup }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating marketplace writeup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract a region/city from full address
function extractRegion(address: string, country: string | null): string {
  if (!address) return country || 'Unknown';

  const parts = address.split(',').map(p => p.trim());

  if (parts.length >= 2) {
    for (let i = parts.length - 2; i >= 0; i--) {
      const part = parts[i];
      if (part && part.length > 2 && !/^\d+$/.test(part) && !/^[A-Z]{1,2}\d/.test(part)) {
        return part;
      }
    }
  }

  return parts[0] || country || 'Unknown';
}
