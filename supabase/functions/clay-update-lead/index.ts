const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    const data = await req.json();
    console.log("Received data from Clay:", data);

    // Get the Airtable record ID
    const leadId = data.id || data.lead_id || data.Id || data.record_id || data.airtable_id;

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "Missing lead ID (Airtable record ID)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Airtable fields object
    const fields: Record<string, any> = {};

    // Company fields - map to Airtable field names
    if (data.company_name || data["Company Name"] || data.Name)
      fields['Company Name'] = data.company_name || data["Company Name"] || data.Name;
    if (data.company_website || data["Company Website"] || data.Website)
      fields['Company Website'] = data.company_website || data["Company Website"] || data.Website;
    if (data.company_linkedin || data["Company Linkedin"] || data["Company LinkedIn"])
      fields['Company LinkedIn'] = data.company_linkedin || data["Company Linkedin"] || data["Company LinkedIn"];
    if (data.company_description || data.Description || data["Company Description"])
      fields['Company Description'] = data.company_description || data.Description || data["Company Description"];
    if (data.industry || data.Industry || data["Industry (2)"])
      fields['Industry'] = data.industry || data.Industry || data["Industry (2)"];
    if (data.employee_count || data["Employee Count"] || data["Employee Count (2)"]) {
      const count = data.employee_count || data["Employee Count"] || data["Employee Count (2)"];
      fields['Employee Count'] = typeof count === 'number' ? count : parseInt(count) || null;
    }
    if (data.company_size || data.Size || data["Company Size"])
      fields['Company Size'] = data.company_size || data.Size || data["Company Size"];
    if (data.country || data.Country || data["Country (2)"])
      fields['Country'] = data.country || data.Country || data["Country (2)"];
    if (data.address || data.Address || data["Address - Locations"])
      fields['Address'] = data.address || data.Address || data["Address - Locations"];

    // Contact fields
    if (data.contact_name || data["Contact Name"])
      fields['Contact Name'] = data.contact_name || data["Contact Name"];
    if (data.contact_title || data["Contact Title"])
      fields['Contact Title'] = data.contact_title || data["Contact Title"];
    if (data.email || data.Email)
      fields['Email'] = data.email || data.Email;
    if (data.phone || data.Phone)
      fields['Phone'] = data.phone || data.Phone;
    if (data.contact_linkedin || data["Contact Linkedin"] || data["Contact LinkedIn"])
      fields['Contact LinkedIn'] = data.contact_linkedin || data["Contact Linkedin"] || data["Contact LinkedIn"];
    if (data.availability || data.Availability)
      fields['Availability'] = data.availability || data.Availability;
    if (data.next_action || data["Next Action"])
      fields['Next Action'] = data.next_action || data["Next Action"];

    // Job fields
    if (data.job_title || data["Job Title"] || data["Job Title (2)"])
      fields['Job Title'] = data.job_title || data["Job Title"] || data["Job Title (2)"];
    if (data.job_level || data["Job Level"])
      fields['Job Level'] = data.job_level || data["Job Level"];
    if (data.job_type || data["Job Type"])
      fields['Job Type'] = data.job_type || data["Job Type"];
    if (data.job_description || data["Job Description"])
      fields['Job Description'] = data.job_description || data["Job Description"];
    if (data.job_url || data["Job Url"] || data["Job Post URL"] || data["Job URL"])
      fields['Job URL'] = data.job_url || data["Job Url"] || data["Job Post URL"] || data["Job URL"];

    // AI Summary
    if (data.ai_summary || data["AI Summary"])
      fields['AI Summary'] = data.ai_summary || data["AI Summary"];

    console.log("Updating Airtable lead", leadId, "with fields:", fields);

    // Update the record in Airtable
    const tableName = 'Qualified Lead Table';
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(tableName)}/${leadId}`;

    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Airtable API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      return new Response(
        JSON.stringify({ error: `Airtable API error: ${response.status} - ${errorBody}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updatedRecord = await response.json();
    console.log("Successfully updated Airtable record:", updatedRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        updated_fields: Object.keys(fields),
        record_id: updatedRecord.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
