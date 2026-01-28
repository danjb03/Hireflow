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

    // Use admin client for database queries (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user has rep role using admin client
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isRep = roles?.some(r => r.role === 'rep');
    if (!isRep) {
      throw new Error('Rep access required');
    }

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
    const repName = profile.client_name;
    console.log(`Fetching leads for rep: ${repName} (Airtable ID: ${airtableRepId})`);

    if (!repName) {
      throw new Error('Rep name not configured in profile');
    }

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    const airtableClientsTable = Deno.env.get('AIRTABLE_CLIENTS_TABLE') || 'Clients';
    const airtableLeadsTable = Deno.env.get('AIRTABLE_LEADS_TABLE') || 'Qualified Lead Table';

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Build filter: Rep field matches this rep's NAME (ARRAYJOIN returns names, not IDs)
    // Escape single quotes in rep name for Airtable formula
    const escapedRepName = repName.replace(/'/g, "\\'").trim();
    const filterFormula = `AND(FIND('${escapedRepName}', ARRAYJOIN({Rep})) > 0, {Status} != 'Not Qualified')`;
    const tableName = airtableLeadsTable;
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
        const clientsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableClientsTable)}?filterByFormula=OR(${recordFilter})`;

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
        contactLinkedIn: fields['Contact LinkedIn'] || null,

        // Company Info
        companyWebsite: fields['Company Website'] || '',
        companyLinkedIn: fields['Company LinkedIn'] || null,
        companyDescription: fields['Company Description'] || null,
        address: Array.isArray(fields['Address']) ? fields['Address'].join(', ') : (fields['Address'] || null),
        country: fields['Country'] || null,
        industry: fields['Industry'] || null,
        industry2: fields['Industry 2'] || null,
        employeeCount: fields['Employee Count'] || null,
        companySize: fields['Company Size'] || null,
        founded: fields['Founded'] || null,

        // Role Info
        titlesOfRoles: fields['Titles of Roles'] || null,

        // Notes
        internalNotes: fields['Internal Notes'] || null,
        clientNotes: (() => {
          const notes = fields['NOTES'] ?? fields['Client Notes'];
          if (!notes) return null;
          if (typeof notes === 'string') return notes;
          if (typeof notes === 'object' && notes.value) return String(notes.value);
          return null;
        })(),

        // Dates & Activity
        dateAdded: fields['Date Created'] || record.createdTime,
        lastContactDate: fields['Last Contact Date'] || null,
        booking: fields['Booking'] || null,
        availability: fields['Availability'] || null,
        nextAction: fields['Next Action'] || null,

        // Callback slots
        callback1: fields['Callback 1'] || null,
        callback2: fields['Callback 2'] || null,
        callback3: fields['Callback 3'] || null,

        // Client Feedback (from the client about lead quality)
        feedback: fields['Feedback'] || null,
      };
    });

    return new Response(
      JSON.stringify({ leads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        context: {
          clientsTable: Deno.env.get('AIRTABLE_CLIENTS_TABLE') || 'Clients',
          leadsTable: Deno.env.get('AIRTABLE_LEADS_TABLE') || 'Qualified Lead Table',
        }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
