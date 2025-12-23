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

    const leadData = await req.json();
    if (!leadData.companyName) throw new Error('Company name is required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Build Airtable fields object
    const airtableFields: Record<string, any> = {
      'Company Name': leadData.companyName,
      'Status': 'New',
      'Date Created': new Date().toISOString(),
    };

    // Add optional fields
    if (leadData.companyWebsite) airtableFields['Company Website'] = leadData.companyWebsite;
    if (leadData.companyLinkedIn) airtableFields['Company LinkedIn'] = leadData.companyLinkedIn;
    if (leadData.industry) airtableFields['Industry'] = leadData.industry;
    if (leadData.companySize) airtableFields['Company Size'] = leadData.companySize;
    if (leadData.employeeCount) airtableFields['Employee Count'] = leadData.employeeCount;
    if (leadData.country) airtableFields['Country'] = leadData.country;
    if (leadData.address || leadData.location) airtableFields['Address'] = leadData.address || leadData.location;
    if (leadData.companyDescription) airtableFields['Company Description'] = leadData.companyDescription;
    if (leadData.contactName) airtableFields['Contact Name'] = leadData.contactName;
    if (leadData.contactTitle) airtableFields['Contact Title'] = leadData.contactTitle;
    if (leadData.jobTitle) airtableFields['Job Title'] = leadData.jobTitle;
    if (leadData.email) airtableFields['Email'] = leadData.email;
    if (leadData.phone) airtableFields['Phone'] = leadData.phone;
    if (leadData.contactLinkedIn || leadData.linkedInProfile) airtableFields['Contact LinkedIn'] = leadData.contactLinkedIn || leadData.linkedInProfile;
    if (leadData.aiSummary) airtableFields['AI Summary'] = leadData.aiSummary;
    if (leadData.jobDescription) airtableFields['Job Description'] = leadData.jobDescription;
    if (leadData.jobUrl) airtableFields['Job URL'] = leadData.jobUrl;
    if (leadData.jobType) airtableFields['Job Type'] = leadData.jobType;
    if (leadData.jobLevel) airtableFields['Job Level'] = leadData.jobLevel;
    if (leadData.availability) airtableFields['Availability'] = leadData.availability;
    if (leadData.feedback) airtableFields['Feedback'] = leadData.feedback;
    if (leadData.lastContactDate) airtableFields['Last Contact Date'] = leadData.lastContactDate;
    if (leadData.nextAction) airtableFields['Next Action'] = leadData.nextAction;

    // Create record in Airtable
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table`;
    const response = await fetch(airtableUrl, {
      method: 'POST',
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
      throw new Error(`Failed to create lead: ${response.status}`);
    }

    const createdRecord = await response.json();
    console.log(`Successfully created lead: ${createdRecord.id}`);

    return new Response(
      JSON.stringify({ success: true, lead: createdRecord }),
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
