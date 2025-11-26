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
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('Fetching leads for user:', user.id);

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Check if user is admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    console.log('User is admin:', isAdmin);

    let allLeads: any[] = [];

    if (isAdmin) {
      // Admin: Fetch all leads from Airtable
      console.log('Admin fetching all leads');
      
      const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table`;
      
      const response = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const data = await response.json();
      allLeads = transformAirtableRecords(data.records || []);

    } else {
      // Client: Fetch only their leads based on client_name
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('client_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.client_name) {
        console.log('No client name configured for user');
        throw new Error('No client name configured for your account. Please contact your administrator.');
      }

      console.log('Client fetching leads for:', profile.client_name);

      // Fetch leads filtered by client name using Airtable formula
      const filterFormula = `{Client Name} = '${profile.client_name.replace(/'/g, "\\'")}'`;
      const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table?filterByFormula=${encodeURIComponent(filterFormula)}`;
      
      const response = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const data = await response.json();
      allLeads = transformAirtableRecords(data.records || []);
    }

    console.log('Fetched total leads:', allLeads.length);
    return new Response(
      JSON.stringify({ leads: allLeads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-client-leads:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function transformAirtableRecords(records: any[]): any[] {
  return records.map(record => {
    const fields = record.fields;
    
    // Calculate status based on age if not set
    const notionStatus = fields['STAGE'];
    const dateAdded = fields['Date Added'] || record.createdTime;
    const daysSinceAdded = Math.floor((Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60 * 24));
    
    let calculatedStatus = notionStatus;
    if (!notionStatus) {
      calculatedStatus = daysSinceAdded >= 5 ? 'Lead' : 'NEW';
    }
    
    return {
      id: record.id,
      companyName: fields['Company Name'] || '',
      status: calculatedStatus,
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
      jobOpenings: parseJobOpenings(fields['Job Openings']),
    };
  });
}

function parseJobOpenings(jobOpeningsText: string | null | undefined): any[] {
  if (!jobOpeningsText) return [];
  
  try {
    return JSON.parse(jobOpeningsText);
  } catch (e) {
    return [];
  }
}
