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
      filterParts.push(`{Status} = '${statusFilter.replace(/'/g, "\\'")}'`);
    }
    
    if (clientFilter) {
      if (clientFilter === 'unassigned') {
        filterParts.push(`OR({Client} = '', {Client} = BLANK())`);
      } else {
        filterParts.push(`{Client} = '${clientFilter.replace(/'/g, "\\'")}'`);
      }
    }
    
    if (searchTerm) {
      filterParts.push(`SEARCH(LOWER('${searchTerm.replace(/'/g, "\\'")}'), LOWER({Company Name})) > 0`);
    }

    const filterFormula = filterParts.length > 0 ? `AND(${filterParts.join(', ')})` : '';
    const tableName = 'Qualified Lead Table';
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(tableName)}${
      filterFormula ? `?filterByFormula=${encodeURIComponent(filterFormula)}` : ''
    }`;

    console.log('Fetching all leads from Airtable');
    console.log('Base ID:', airtableBaseId);
    console.log('URL:', airtableUrl);

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
        statusText: response.statusText,
        body: errorBody,
        baseId: airtableBaseId,
        tableName: tableName
      });
      throw new Error(`Airtable API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const leads = data.records.map((record: any) => {
      const fields = record.fields;
      return {
        id: record.id,
        companyName: fields['Company Name'] || '',
        status: fields['Status'] || 'New',
        assignedClient: fields['Client'] || 'Unassigned',
        assignedClientId: null,
        
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
