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
      // Non-admin: Check if user is a Rep or a Client
      console.log('Looking up user by email:', user.email);

      // First, check if user is a Rep
      const repsUrl = `https://api.airtable.com/v0/${airtableBaseId}/Reps?filterByFormula=${encodeURIComponent(`{Email} = '${user.email}'`)}`;
      const repsResponse = await fetch(repsUrl, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!repsResponse.ok) {
        throw new Error(`Airtable API error fetching rep: ${repsResponse.status}`);
      }

      const repsData = await repsResponse.json();
      const repRecords = repsData.records || [];

      if (repRecords.length > 0) {
        // User is a Rep - show their uploaded leads
        const repRecordId = repRecords[0].id;
        const repName = repRecords[0].fields?.Name || '';
        console.log('Found rep:', repName, 'with ID:', repRecordId);

        const filterFormula = `FIND('${repRecordId}', ARRAYJOIN({Rep}))`;
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
        console.log('Found', allLeads.length, 'leads for rep:', repName);

      } else {
        // User is not a Rep - check if they're a Client
        console.log('Not a rep, checking if user is a client:', user.email);

        const clientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/Clients?filterByFormula=${encodeURIComponent(`{Email} = '${user.email}'`)}`;
        const clientsResponse = await fetch(clientsUrl, {
          headers: {
            'Authorization': `Bearer ${airtableToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!clientsResponse.ok) {
          throw new Error(`Airtable API error fetching client: ${clientsResponse.status}`);
        }

        const clientsData = await clientsResponse.json();
        const clientRecords = clientsData.records || [];

        if (clientRecords.length === 0) {
          console.log('No client found for email:', user.email);
          return new Response(
            JSON.stringify({ leads: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const clientRecordId = clientRecords[0].id;
        const clientName = clientRecords[0].fields?.Name || '';
        console.log('Found client:', clientName, 'with ID:', clientRecordId);

        // SECURITY: Clients only see leads assigned to them AND with Status = "Approved"
        const filterFormula = `AND(FIND('${clientRecordId}', ARRAYJOIN({Clients})), {Status} = 'Approved')`;
        const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table?filterByFormula=${encodeURIComponent(filterFormula)}`;

        console.log('Fetching approved leads for client with filter:', filterFormula);

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
        console.log('Found', allLeads.length, 'approved leads for client:', clientName);
      }
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
      
      // Internal Notes (raw rep notes) and Client Notes (AI improved)
      internalNotes: fields['Internal Notes'] || null,
      clientNotes: (() => {
        const notes = fields['Client Notes'];
        if (!notes) return null;
        if (typeof notes === 'string') return notes;
        if (typeof notes === 'object' && notes.value) return String(notes.value);
        return null;
      })(),
      booking: fields['Booking'] || null,
      availability: fields['Availability'] || null,
      lastContactDate: fields['Last Contact Date'] || null,
      nextAction: fields['Next Action'] || null,
      dateCreated: fields['Date Created'] || record.createdTime,

      // Callback appointment slots
      callbackDate1: fields['Callback Date 1'] || null,
      callbackTime1: fields['Callback Time 1'] || null,
      callbackDate2: fields['Callback Date 2'] || null,
      callbackTime2: fields['Callback Time 2'] || null,
      callbackDate3: fields['Callback Date 3'] || null,
      callbackTime3: fields['Callback Time 3'] || null,

      // Rep info
      repId: fields['Rep'] ? fields['Rep'][0] : null,
    };
  });
}

