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

    const { leadId, updates } = await req.json();
    if (!leadId || !updates) throw new Error('Lead ID and updates required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Map frontend field names to Airtable field names
    const fieldMapping: Record<string, string> = {
      companyName: 'Company Name',
      companyWebsite: 'Company Website',
      companyLinkedIn: 'Company LinkedIn',
      industry: 'Industry',
      companySize: 'Company Size',
      employeeCount: 'Employee Count',
      country: 'Country',
      address: 'Address',
      companyDescription: 'Company Description',
      contactName: 'Contact Name',
      contactTitle: 'Contact Title',
      jobTitle: 'Job Title',
      email: 'Email',
      phone: 'Phone',
      linkedInProfile: 'Contact LinkedIn',
      aiSummary: 'AI Summary',
      jobDescription: 'Job Description',
      jobUrl: 'Job URL',
      jobType: 'Job Type',
      jobLevel: 'Job Level',
      feedback: 'Feedback',
      lastContactDate: 'Last Contact Date',
      nextAction: 'Next Action',
      availability: 'Availability',
    };

    // Build Airtable fields object
    const airtableFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      const airtableFieldName = fieldMapping[key];
      if (airtableFieldName) {
        airtableFields[airtableFieldName] = value;
      }
    }

    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table/${leadId}`;
    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: airtableFields
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable error:', errorText);
      throw new Error(`Failed to update lead: ${response.status}`);
    }

    const updatedRecord = await response.json();
    console.log(`Successfully updated lead ${leadId}`);

    return new Response(
      JSON.stringify({ success: true, lead: updatedRecord }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
