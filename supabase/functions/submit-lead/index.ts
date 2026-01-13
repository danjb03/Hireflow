const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData = await req.json();
    console.log('Received lead data:', JSON.stringify(leadData));

    if (!leadData.companyName) {
      throw new Error('Company name is required');
    }
    if (!leadData.repId) {
      throw new Error('Rep selection is required');
    }

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

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
    if (leadData.email) airtableFields['Email'] = leadData.email;
    if (leadData.phone) {
      airtableFields['Phone'] = String(leadData.phone);
    }
    if (leadData.contactLinkedIn) airtableFields['Contact LinkedIn'] = leadData.contactLinkedIn;

    // Job Info
    if (leadData.jobTitle) airtableFields['Job Title'] = leadData.jobTitle;
    if (leadData.jobDescription) airtableFields['Job Description'] = leadData.jobDescription;

    // Call Notes
    if (leadData.aiSummary) airtableFields['Internal Notes'] = leadData.aiSummary;

    // Callback DateTime fields (ISO format for Airtable)
    if (leadData.callback1) airtableFields['Callback 1'] = new Date(leadData.callback1).toISOString();
    if (leadData.callback2) airtableFields['Callback 2'] = new Date(leadData.callback2).toISOString();
    if (leadData.callback3) airtableFields['Callback 3'] = new Date(leadData.callback3).toISOString();

    // Link to Rep (expects Airtable record ID)
    if (leadData.repId) {
      airtableFields['Rep'] = [leadData.repId];
    }

    // Close Link URL (admin only field)
    if (leadData.closeLinkUrl) {
      airtableFields['Close Link URL'] = leadData.closeLinkUrl;
    }

    console.log('Creating lead with fields:', Object.keys(airtableFields).join(', '));

    // Create record in Airtable
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table`;

    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: airtableFields })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable error:', response.status, errorText);
      throw new Error(`Airtable error: ${response.status} - ${errorText}`);
    }

    const createdRecord = await response.json();
    console.log('Created lead:', createdRecord.id);

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
