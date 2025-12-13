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
      status: fields['Status'] || 'New',
      clients: fields['Client'] || 'Unassigned',
      
      // Contact Info
      contactName: fields['Contact Name'] || null,
      contactTitle: fields['Contact Title'] || null,
      email: fields['Email'] || '',
      phone: fields['Phone'] ? String(fields['Phone']) : '',
      contactLinkedIn: fields['Contact LinkedIn'] || null,
      
      // Company Info
      companyWebsite: fields['Company Website'] || '',
      companyLinkedIn: fields['Company LinkedIn'] || null,
      companyDescription: fields['Company Description'] || null,
      address: Array.isArray(fields['Address']) ? fields['Address'].join(', ') : (fields['Address'] || null),
      country: fields['Country'] || null,
      industry: fields['Industry'] || null,
      employeeCount: fields['Employee Count'] || null,
      companySize: fields['Company Size'] || null,
      
      // Job Info
      jobTitle: fields['Job Title'] || null,
      jobDescription: fields['Job Description'] || null,
      jobUrl: fields['Job URL'] || null,
      jobType: fields['Job Type'] || null,
      jobLevel: fields['Job Level'] || null,
      
      // AI & Dates
      aiSummary: fields['AI Summary'] || null,
      availability: fields['Availability'] || null,
      lastContactDate: fields['Last Contact Date'] || null,
      nextAction: fields['Next Action'] || null,
      dateCreated: fields['Date Created'] || record.createdTime,
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
