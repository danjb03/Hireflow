import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import { ApplicationError, ApolloAPI, BetterContactAPI } from "./utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main orchestration function
async function executeListBuilding(jobId: string, config: any, supabaseClient: any) {
  const {
    target_titles,
    company_size_ranges,
    company_locations,
    job_keywords,
    result_limit,
    airtable_client_id
  } = config;

  const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
  const betterContactApiKey = Deno.env.get('BETTERCONTACT_API_KEY');

  if (!apolloApiKey || !betterContactApiKey) {
    throw new ApplicationError('API keys missing', 'Apollo or BetterContact API keys are not set in environment variables.');
  }

  const apollo = new ApolloAPI(apolloApiKey);
  const betterContact = new BetterContactAPI(betterContactApiKey);

  // 1. Find Companies (Apollo Organization Search)
  await supabaseClient.from('list_building_jobs').update({ status: 'finding_companies', progress: { step: 1, message: 'Searching for target companies...' } }).eq('id', jobId);
  
  const companyFilters = {
    organization_num_employees_ranges: company_size_ranges,
    organization_locations: company_locations,
    q_organization_job_titles: job_keywords,
    // Add more filters as needed (e.g., revenue, funding)
  };

  const companies = await apollo.searchOrganizations(companyFilters);
  
  if (companies.length === 0) {
    await supabaseClient.from('list_building_jobs').update({ status: 'completed', progress: { step: 1, message: 'No companies found matching criteria.' }, result_count: 0 }).eq('id', jobId);
    return;
  }

  // 2. Find People (Apollo People Search)
  await supabaseClient.from('list_building_jobs').update({ status: 'finding_people', progress: { step: 2, message: `Found ${companies.length} companies. Searching for people...` } }).eq('id', jobId);

  let leadsToEnrich: any[] = [];
  let totalLeadsFound = 0;

  for (const company of companies) {
    if (totalLeadsFound >= result_limit) break;

    const peopleFilters = {
      organization_ids: [company.id],
      person_titles: target_titles,
      // Add more filters as needed (e.g., seniority)
    };

    const people = await apollo.searchPeople(peopleFilters);
    
    for (const person of people) {
      if (totalLeadsFound >= result_limit) break;
      
      leadsToEnrich.push({
        job_id: jobId,
        company_name: company.name,
        company_domain: company.domain,
        company_size: company.size,
        company_industry: company.industry,
        company_location: company.location,
        apollo_organization_id: company.id,
        person_name: person.name,
        person_title: person.title,
        person_seniority: person.seniority,
        person_linkedin: person.linkedin_url,
        apollo_person_id: person.id,
        enrichment_status: 'pending'
      });
      totalLeadsFound++;
    }
  }

  // 3. Enrich Contact Data (BetterContact API)
  await supabaseClient.from('list_building_jobs').update({ status: 'enriching', progress: { step: 3, message: `Found ${totalLeadsFound} leads. Starting enrichment...` } }).eq('id', jobId);

  const batchSize = 100;
  let enrichedCount = 0;

  for (let i = 0; i < leadsToEnrich.length; i += batchSize) {
    const batch = leadsToEnrich.slice(i, i + batchSize);
    
    const betterContactLeads = batch.map(lead => ({
      first_name: lead.person_name.split(' ')[0],
      last_name: lead.person_name.split(' ').slice(1).join(' '),
      company_domain: lead.company_domain,
      linkedin_url: lead.person_linkedin,
      custom_fields: {
        job_id: lead.job_id,
        apollo_person_id: lead.apollo_person_id
      }
    }));

    // Submit enrichment job to BetterContact
    const enrichmentJob = await betterContact.submitEnrichment(betterContactLeads);
    
    // For simplicity in this Deno function, we will poll for results instead of using a webhook
    // In a production environment, a separate service would handle the webhook/polling
    const enrichedResults = await betterContact.pollForResults(enrichmentJob.id);

    // Update the leads with enriched data
    const updates = enrichedResults.map((result: any) => {
      const originalLead = leadsToEnrich.find(l => l.apollo_person_id === result.custom_fields.apollo_person_id);
      
      if (originalLead) {
        return {
          ...originalLead,
          person_email: result.email || null,
          person_phone: result.phone || null,
          enrichment_status: result.email || result.phone ? 'enriched' : 'failed_enrichment'
        };
      }
      return null;
    }).filter(Boolean);

    // Insert enriched leads into the database
    const { error: insertError } = await supabaseClient.from('list_building_results').insert(updates);
    if (insertError) throw new ApplicationError('Database Insert Error', insertError.message);

    enrichedCount += updates.length;
    await supabaseClient.from('list_building_jobs').update({ progress: { step: 3, message: `Enriched ${enrichedCount} of ${totalLeadsFound} leads.` } }).eq('id', jobId);
  }

  // 4. Finalize Job
  await supabaseClient.from('list_building_jobs').update({ 
    status: 'completed', 
    progress: { step: 4, message: 'List building completed.' },
    result_count: enrichedCount,
    completed_at: new Date().toISOString()
  }).eq('id', jobId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let jobId: string | null = null;
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  try {
    const body = await req.json();
    jobId = body.jobId;
    if (!jobId) throw new ApplicationError('Invalid Request', 'Missing jobId in request body.');

    // Fetch job configuration
    const { data: job, error: fetchError } = await supabaseClient
      .from('list_building_jobs')
      .select('config, airtable_client_id')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) throw new ApplicationError('Job Not Found', 'Could not find job with the provided ID.');

    // Run the orchestration logic
    await executeListBuilding(jobId, { ...job.config, airtable_client_id: job.airtable_client_id }, supabaseClient);

    return new Response(
      JSON.stringify({ success: true, message: 'List building process completed.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in execute-list-building:', error);
    const isAppError = error instanceof ApplicationError;
    const status = isAppError ? 400 : 500;
    const errorMessage = isAppError ? error.message : 'Internal Server Error';
    const errorDetails = isAppError ? error.details : (error instanceof Error ? error.message : 'Unknown error');

    // Update job status to failed if we have a jobId
    if (jobId) {
      try {
        await supabaseClient.from('list_building_jobs').update({
          status: 'failed',
          error: `${errorMessage}: ${errorDetails}`
        }).eq('id', jobId);
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage, details: errorDetails }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
