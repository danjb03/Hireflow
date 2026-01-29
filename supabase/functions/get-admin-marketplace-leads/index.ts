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
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Parse request body for filters
    let statusFilter: string | null = null;
    try {
      const body = await req.json();
      statusFilter = body?.statusFilter || null;
    } catch {
      // No body, fetch all marketplace-eligible leads
    }

    // Build filter formula
    // Marketplace-eligible: Rejected, Needs Work, or already has a marketplace status
    let filterFormula: string;
    if (statusFilter) {
      filterFormula = `{marketplace status} = '${statusFilter}'`;
    } else {
      // Fetch leads that are rejected, needs work, or have any marketplace status
      filterFormula = `OR(LOWER({Status}) = 'rejected', LOWER({Status}) = 'needs work', {marketplace status} != '')`;
    }

    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table?filterByFormula=${encodeURIComponent(filterFormula)}`;

    const allLeads: any[] = [];
    let offset: string | undefined = undefined;

    let keepFetching = true;
    while (keepFetching) {
      const url = offset ? `${airtableUrl}&offset=${offset}` : airtableUrl;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const data = await response.json();

      const pageLeads = (data.records || []).map((record: any) => {
        const fields = record.fields;

        return {
          id: record.id,
          companyName: fields['Company Name'] || '',
          status: fields['Status'] || 'New',
          marketplaceStatus: fields['marketplace status'] || null,
          marketplaceWriteup: fields['Marketplace Write-up'] || null,
          clients: fields['Clients'] || 'Unassigned',
          // Contact Info (for admin view)
          contactName: fields['Contact Name'] || null,
          email: fields['Email'] || '',
          phone: fields['Phone'] ? String(fields['Phone']) : '',
          // Company Info
          companyWebsite: fields['Company Website'] || '',
          industry: fields['Industry'] || null,
          industry2: fields['Industry 2'] || null,
          address: Array.isArray(fields['Address']) ? fields['Address'].join(', ') : (fields['Address'] || null),
          country: fields['Country'] || null,
          companySize: fields['Company Size'] || fields['Employee Count'] || null,
          companyDescription: fields['Company Description'] || null,
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
          // Meta
          dateCreated: fields['Date Created'] || record.createdTime,
        };
      });

      allLeads.push(...pageLeads);
      offset = data.offset;
      keepFetching = Boolean(offset);
    }

    return new Response(
      JSON.stringify({ leads: allLeads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching admin marketplace leads:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
