import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data = await req.json();
    console.log("Received data from Clay:", data);

    const leadId = data.id || data.lead_id || data.Id || data.record_id;
    
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "Missing lead ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updateData = {};

    // Company fields
    if (data.company_name || data["Company Name"] || data.Name) 
      updateData.company_name = data.company_name || data["Company Name"] || data.Name;
    if (data.company_website || data["Company Website"] || data.Website) 
      updateData.company_website = data.company_website || data["Company Website"] || data.Website;
    if (data.company_linkedin || data["Company Linkedin"]) 
      updateData.company_linkedin = data.company_linkedin || data["Company Linkedin"];
    if (data.company_description || data.Description) 
      updateData.company_description = data.company_description || data.Description;
    if (data.industry || data.Industry || data["Industry (2)"]) 
      updateData.industry = data.industry || data.Industry || data["Industry (2)"];
    if (data.employee_count || data["Employee Count"] || data["Employee Count (2)"]) {
      const count = data.employee_count || data["Employee Count"] || data["Employee Count (2)"];
      updateData.employee_count = typeof count === 'number' ? count : parseInt(count) || null;
    }
    if (data.company_size || data.Size) 
      updateData.company_size = data.company_size || data.Size;
    if (data.country || data.Country || data["Country (2)"]) 
      updateData.country = data.country || data.Country || data["Country (2)"];
    if (data.address || data.Address || data["Address - Locations"]) 
      updateData.address = data.address || data.Address || data["Address - Locations"];
    if (data.founded || data.Founded) 
      updateData.founded = data.founded || data.Founded;
    if (data.locality || data.Locality) 
      updateData.locality = data.locality || data.Locality;
    if (data.logo_url || data["Logo Url"]) 
      updateData.logo_url = data.logo_url || data["Logo Url"];
    if (data.follower_count || data["Follower Count"]) {
      const count = data.follower_count || data["Follower Count"];
      updateData.follower_count = typeof count === 'number' ? count : parseInt(count) || null;
    }

    // Contact fields
    if (data.contact_name || data["Contact Name"]) 
      updateData.contact_name = data.contact_name || data["Contact Name"];
    if (data.contact_title || data["Contact Title"]) 
      updateData.contact_title = data.contact_title || data["Contact Title"];
    if (data.email || data.Email) 
      updateData.email = data.email || data.Email;
    if (data.phone || data.Phone) 
      updateData.phone = data.phone || data.Phone;
    if (data.contact_linkedin || data["Contact Linkedin"]) 
      updateData.contact_linkedin = data.contact_linkedin || data["Contact Linkedin"];
    if (data.availability || data.Availability) 
      updateData.availability = data.availability || data.Availability;
    if (data.next_action || data["Next Action"]) 
      updateData.next_action = data.next_action || data["Next Action"];

    // Job fields
    if (data.job_title || data["Job Title"] || data["Job Title (2)"]) 
      updateData.job_title = data.job_title || data["Job Title"] || data["Job Title (2)"];
    if (data.job_level || data["Job Level"]) 
      updateData.job_level = data.job_level || data["Job Level"];
    if (data.job_type || data["Job Type"]) 
      updateData.job_type = data.job_type || data["Job Type"];
    if (data.job_description || data["Job Description"]) 
      updateData.job_description = data.job_description || data["Job Description"];
    if (data.job_url || data["Job Url"] || data["Job Post URL"]) 
      updateData.job_url = data.job_url || data["Job Url"] || data["Job Post URL"];
    if (data.date_job_posted || data["Date Job Was Posted"]) 
      updateData.date_job_posted = data.date_job_posted || data["Date Job Was Posted"];
    if (data.remote !== undefined || data.Remote !== undefined) 
      updateData.remote = data.remote ?? data.Remote;
    if (data.num_jobs_last_30_days || data["Num Jobs Last_30Days"]) {
      const count = data.num_jobs_last_30_days || data["Num Jobs Last_30Days"];
      updateData.num_jobs_last_30_days = typeof count === 'number' ? count : parseInt(count) || null;
    }
    if (data.job_openings || data["Job Openings"]) {
      const openings = data.job_openings || data["Job Openings"];
      updateData.job_openings = typeof openings === 'string' ? openings : JSON.stringify(openings);
    }

    console.log("Updating lead", leadId, "with:", updateData);

    const { error } = await supabase.from("leads").update(updateData).eq("id", leadId);

    if (error) {
      console.error("Supabase error:", error);
      return new Response(JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, updated_fields: Object.keys(updateData) }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
