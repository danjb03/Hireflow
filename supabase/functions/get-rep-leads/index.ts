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
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user has rep role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isRep = roles?.some(r => r.role === 'rep');
    if (!isRep) {
      throw new Error('Rep access required');
    }

    // Get rep's airtable_rep_id from profile
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('airtable_rep_id, client_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.airtable_rep_id) {
      console.error('Profile error or missing airtable_rep_id:', profileError);
      throw new Error('Rep profile not configured with Airtable rep ID');
    }

    const airtableRepId = profile.airtable_rep_id;
    console.log(`Fetching leads for rep: ${profile.client_name} (Airtable ID: ${airtableRepId})`);

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Build filter: Rep field matches this rep's Airtable ID
    // Simple filter - just show all leads for this rep
    const filterFormula = `AND(FIND('${airtableRepId}', ARRAYJOIN({Rep})) > 0, {Status} != 'Not Qualified')`;
    const tableName = 'Qualified Lead Table';
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(filterFormula)}&sort[0][field]=Date%20Created&sort[0][direction]=desc`;

    console.log('Filter formula:', filterFormula);
    console.log('Fetching leads from Airtable...');

    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Airtable API Error:', {
        status: response.status,
        body: errorBody
      });
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.records?.length || 0} leads`);

    // Create client name map
    const clientNameMap = new Map<string, string>();

    // Fetch client names from Clients table
    const clientRecordIds = new Set<string>();
    data.records?.forEach((record: any) => {
      const clientField = record.fields['Clients'];
      if (Array.isArray(clientField)) {
        clientField.forEach((id: string) => {
          clientRecordIds.add(id);
        });
      }
    });

    if (clientRecordIds.size > 0) {
      const clientIdsArray = Array.from(clientRecordIds);
      for (let i = 0; i < clientIdsArray.length; i += 10) {
        const batch = clientIdsArray.slice(i, i + 10);
        const recordFilter = batch.map(id => `RECORD_ID() = '${id}'`).join(',');
        const clientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/Clients?filterByFormula=OR(${recordFilter})`;

        try {
          const clientsResponse = await fetch(clientsUrl, {
            headers: {
              'Authorization': `Bearer ${airtableToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            clientsData.records.forEach((clientRecord: any) => {
              const clientName = clientRecord.fields['Client Name'] || clientRecord.fields['Name'] || '';
              if (clientName) {
                clientNameMap.set(clientRecord.id, clientName);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching client names:', error);
        }
      }
    }

    const leads = (data.records || []).map((record: any) => {
      const fields = record.fields;

      // Resolve client name
      let clientName = 'Unknown Client';
      const clientField = fields['Clients'];
      if (Array.isArray(clientField) && clientField.length > 0) {
        clientName = clientNameMap.get(clientField[0]) || 'Unknown Client';
      }

      return {
        id: record.id,
        companyName: fields['Company Name'] || '',
        status: fields['Status'] || 'New',
        clientName: clientName,
        clientId: Array.isArray(clientField) ? clientField[0] : null,

        // Contact Info
        contactName: fields['Contact Name'] || null,
        contactTitle: fields['Contact Title'] || null,
        email: fields['Email'] || '',
        phone: fields['Phone'] ? String(fields['Phone']) : '',

        // Company Info
        companyWebsite: fields['Company Website'] || '',
        industry: fields['Industry'] || null,
        employeeCount: fields['Employee Count'] || null,

        // Job Info
        jobTitle: fields['Job Title'] || null,
        jobDescription: fields['Job Description'] || null,

        // Dates
        dateAdded: fields['Date Created'] || record.createdTime,
        lastContactDate: fields['Last Contact Date'] || null,

        // Feedback
        feedback: fields['Admin Notes'] || null,
      };
    });

    return new Response(
      JSON.stringify({ leads }),
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
