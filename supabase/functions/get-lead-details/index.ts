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

    // Check if user is admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin');

    // Fetch the lead first
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

    // SECURITY: If not admin, verify user has access to this lead
    if (!isAdmin) {
      // Check if user is a Rep who uploaded this lead
      const repsUrl = `https://api.airtable.com/v0/${airtableBaseId}/Reps?filterByFormula=${encodeURIComponent(`{Email} = '${user.email}'`)}`;
      const repsResponse = await fetch(repsUrl, {
        headers: { 'Authorization': `Bearer ${airtableToken}` }
      });
      const repsData = await repsResponse.json();
      const repRecords = repsData.records || [];

      if (repRecords.length > 0) {
        // User is a rep - check if this lead belongs to them
        const repRecordId = repRecords[0].id;
        const leadRepIds = fields['Rep'] || [];
        if (!leadRepIds.includes(repRecordId)) {
          throw new Error('Access denied: This lead does not belong to you');
        }
      } else {
        // User is a client - check if lead is assigned to them AND is Approved
        const clientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/Clients?filterByFormula=${encodeURIComponent(`{Email} = '${user.email}'`)}`;
        const clientsResponse = await fetch(clientsUrl, {
          headers: { 'Authorization': `Bearer ${airtableToken}` }
        });
        const clientsData = await clientsResponse.json();
        const clientRecords = clientsData.records || [];

        if (clientRecords.length === 0) {
          throw new Error('Access denied: User not found');
        }

        const clientRecordId = clientRecords[0].id;
        const leadClientIds = fields['Clients'] || [];
        const leadStatus = fields['Status'] || '';

        if (!leadClientIds.includes(clientRecordId)) {
          throw new Error('Access denied: This lead is not assigned to you');
        }

        if (leadStatus !== 'Approved') {
          throw new Error('Access denied: This lead is not yet approved');
        }
      }
    }
    
    // Handle Clients field which can be an array of record IDs
    let clientsValue = 'Unassigned';
    const clientsField = fields['Clients'];
    if (clientsField) {
      if (Array.isArray(clientsField)) {
        clientsValue = clientsField.length > 0 ? String(clientsField[0]) : 'Unassigned';
      } else {
        clientsValue = String(clientsField);
      }
    }

    const lead = {
      id: record.id,
      companyName: fields['Company Name'] || '',
      status: fields['Status'] || 'New',
      clients: clientsValue,
      
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
      clientNotes: fields['Client Notes'] || null,
      booking: fields['Booking'] || null,
      availability: fields['Availability'] || null,
      lastContactDate: fields['Last Contact Date'] || null,
      nextAction: fields['Next Action'] || null,
      dateCreated: fields['Date Created'] || record.createdTime,

      // Client Feedback
      feedback: fields['Feedback'] || null,

      // Callback appointment slots
      callbackDate1: fields['Callback Date 1'] || null,
      callbackTime1: fields['Callback Time 1'] || null,
      callbackDate2: fields['Callback Date 2'] || null,
      callbackTime2: fields['Callback Time 2'] || null,
      callbackDate3: fields['Callback Date 3'] || null,
      callbackTime3: fields['Callback Time 3'] || null,

      // Rep info
      repId: fields['Rep'] ? fields['Rep'][0] : null,

      // Task completion status
      tasks: {
        task1: fields['Task 1 Complete'] || false,
        task2: fields['Task 2 Complete'] || false,
        task3: fields['Task 3 Complete'] || false,
        task4: fields['Task 4 Complete'] || false,
        task5: fields['Task 5 Complete'] || false,
        task6: fields['Task 6 Complete'] || false,
        task7: fields['Task 7 Complete'] || false,
      },
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
