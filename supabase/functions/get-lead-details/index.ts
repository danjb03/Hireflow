import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('User not authenticated');

    const { leadId } = await req.json();
    if (!leadId) throw new Error('Lead ID is required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table/${leadId}`;
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);

    const record = await response.json();
    const fields = record.fields;
    
    const lead = {
      id: record.id,
      companyName: fields['Company Name'] || '',
      status: fields['STAGE'] || 'NEW',
      companyWebsite: fields['Company Website'] || '',
      companyLinkedIn: fields['Company LinkedIn'] || null,
      industry: fields['Industry'] || null,
      companySize: fields['Company Size'] || null,
      employeeCount: fields['Employee Count'] || null,
      country: fields['Country'] || null,
      location: fields['Location'] || null,
      companyDescription: fields['Company Description'] || null,
      founded: fields['Founded'] || null,
      contactName: fields['Contact Name'] || null,
      jobTitle: fields['Job Title'] || null,
      email: fields['Email'] || '',
      phone: fields['Phone'] || '',
      linkedInProfile: fields['LinkedIn Profile'] || '',
      callNotes: fields['Call Notes'] || null,
      callbackDateTime: fields['Callback Date/Time'] || null,
      aiSummary: fields['AI Summary'] || null,
      jobPostingTitle: fields['Job Posting Title'] || null,
      jobDescription: fields['Job Description'] || null,
      jobUrl: fields['Job URL'] || null,
      activeJobsUrl: fields['Active Jobs URL'] || null,
      jobsOpen: fields['Jobs Open'] || null,
      dateAdded: fields['Date Added'] || record.createdTime,
      feedback: fields['Feedback'] || null,
      jobOpenings: [],
    };

    return new Response(
      JSON.stringify({ lead }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
