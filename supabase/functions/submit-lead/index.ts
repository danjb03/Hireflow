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
    // Auth is optional - allows both logged-in users and public submissions
    const authHeader = req.headers.get('Authorization');
    let userEmail = 'public';

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user?.email) {
        userEmail = user.email;
      }
    }

    console.log('Lead submission from:', userEmail);

    const leadData = await req.json();
    if (!leadData.companyName) throw new Error('Company name is required');
    if (!leadData.repId) throw new Error('Rep selection is required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Build Airtable fields object
    const airtableFields: Record<string, any> = {
      'Company Name': leadData.companyName,
      'Status': 'New',
      'Date Created': new Date().toISOString(),
    };

    // Company Info
    if (leadData.companyWebsite) airtableFields['Company Website'] = leadData.companyWebsite;
    if (leadData.companyLinkedIn) airtableFields['Company LinkedIn'] = leadData.companyLinkedIn;

    // Contact Info
    if (leadData.contactName) airtableFields['Contact Name'] = leadData.contactName;
    if (leadData.contactTitle) airtableFields['Contact Title'] = leadData.contactTitle;
    if (leadData.email) airtableFields['Email'] = leadData.email;
    if (leadData.phone) airtableFields['Phone'] = leadData.phone;
    if (leadData.contactLinkedIn) airtableFields['Contact LinkedIn'] = leadData.contactLinkedIn;

    // Job Info
    if (leadData.jobTitle) airtableFields['Job Title'] = leadData.jobTitle;
    if (leadData.jobDescription) airtableFields['Job Description'] = leadData.jobDescription;
    if (leadData.jobType) airtableFields['Job Type'] = leadData.jobType;
    if (leadData.jobLevel) airtableFields['Job Level'] = leadData.jobLevel;

    // Call Notes
    if (leadData.aiSummary) airtableFields['AI Summary'] = leadData.aiSummary;

    // Callback DateTime fields (ISO format for Airtable)
    if (leadData.callback1) airtableFields['Callback 1'] = new Date(leadData.callback1).toISOString();
    if (leadData.callback2) airtableFields['Callback 2'] = new Date(leadData.callback2).toISOString();
    if (leadData.callback3) airtableFields['Callback 3'] = new Date(leadData.callback3).toISOString();

    // Link to Rep (expects Airtable record ID)
    if (leadData.repId) {
      airtableFields['Rep'] = [leadData.repId];
    }

    console.log('Creating lead in Airtable with fields:', Object.keys(airtableFields));

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
      throw new Error(`Failed to create lead: ${response.status} - ${errorText}`);
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
