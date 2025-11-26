import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id,
    });

    if (roleError || !isAdmin) {
      throw new Error('Admin access required');
    }

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const clientFilter = url.searchParams.get('client');
    const searchTerm = url.searchParams.get('search');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    let filterParts: string[] = [];
    
    if (statusFilter) {
      filterParts.push(`{STAGE} = '${statusFilter.replace(/'/g, "\\'")}'`);
    }
    
    if (clientFilter) {
      if (clientFilter === 'unassigned') {
        filterParts.push(`OR({Client Name} = '', {Client Name} = BLANK())`);
      } else {
        filterParts.push(`{Client Name} = '${clientFilter.replace(/'/g, "\\'")}'`);
      }
    }
    
    if (searchTerm) {
      filterParts.push(`SEARCH(LOWER('${searchTerm.replace(/'/g, "\\'")}'), LOWER({Company Name})) > 0`);
    }

    const filterFormula = filterParts.length > 0 ? `AND(${filterParts.join(', ')})` : '';
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table${
      filterFormula ? `?filterByFormula=${encodeURIComponent(filterFormula)}` : ''
    }`;

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
    const leads = data.records.map((record: any) => {
      const fields = record.fields;
      return {
        id: record.id,
        companyName: fields['Company Name'] || '',
        status: fields['STAGE'] || 'NEW',
        assignedClient: fields['Client Name'] || 'Unassigned',
        assignedClientId: null,
        dateAdded: fields['Date Added'] || record.createdTime,
        companyWebsite: fields['Company Website'] || '',
        companyLinkedIn: fields['Company LinkedIn'] || null,
        industry: fields['Industry'] || null,
        companySize: fields['Company Size'] || null,
        employeeCount: fields['Employee Count'] || null,
        country: fields['Country'] || null,
        location: fields['Location'] || null,
        contactName: fields['Contact Name'] || null,
        jobTitle: fields['Job Title'] || null,
        email: fields['Email'] || '',
        phone: fields['Phone'] || '',
        linkedInProfile: fields['LinkedIn Profile'] || '',
        callNotes: fields['Call Notes'] || null,
        aiSummary: fields['AI Summary'] || null,
        jobsOpen: fields['Jobs Open'] || null,
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
