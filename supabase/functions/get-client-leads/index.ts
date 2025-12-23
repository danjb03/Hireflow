import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
      const filterFormula = `{Clients} = '${profile.client_name.replace(/'/g, "\\'")}'`;
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
    
    return {
      id: record.id,
      companyName: fields['Company Name'] || '',
      status: fields['Status'] || 'New',
      clients: fields['Clients'] || 'Unassigned',
      
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
      booking: fields['Booking'] || null,
      availability: fields['Availability'] || null,
      lastContactDate: fields['Last Contact Date'] || null,
      nextAction: fields['Next Action'] || null,
      dateCreated: fields['Date Created'] || record.createdTime,
    };
  });
}

