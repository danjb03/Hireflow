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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id,
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const clientFilter = url.searchParams.get('client');
    const searchTerm = url.searchParams.get('search');

    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    const mainDatabaseId = Deno.env.get('MAIN_NOTION_DATABASE_ID');

    if (!notionApiKey || !mainDatabaseId) {
      console.error('Missing Notion configuration');
      return new Response(
        JSON.stringify({ error: 'Notion configuration not set up' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all clients with databases
    const { data: clients, error: clientsError } = await supabaseClient
      .from('profiles')
      .select('id, email, notion_database_id')
      .not('notion_database_id', 'is', null);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch leads from main database and all client databases
    const allLeads = [];
    const databasesToQuery = [
      { id: mainDatabaseId, clientEmail: 'Unassigned', clientId: null },
      ...clients.map(c => ({ id: c.notion_database_id, clientEmail: c.email, clientId: c.id })),
    ];

    for (const db of databasesToQuery) {
      try {
        const notionResponse = await fetch(
          `https://api.notion.com/v1/databases/${db.id}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${notionApiKey}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              page_size: 100,
            }),
          }
        );

        if (notionResponse.ok) {
          const data = await notionResponse.json();
          const leads = data.results.map((page: any) => ({
            id: page.id,
            companyName: page.properties['Company Name']?.title?.[0]?.text?.content || 'N/A',
            contactName: page.properties['Contact Name']?.rich_text?.[0]?.text?.content || 'N/A',
            status: page.properties['Status']?.select?.name || 'N/A',
            assignedClient: db.clientEmail,
            assignedClientId: db.clientId,
            industry: page.properties['Industry']?.select?.name || 'N/A',
            dateAdded: page.created_time,
          }));
          allLeads.push(...leads);
        }
      } catch (error) {
        console.error(`Error fetching from database ${db.id}:`, error);
      }
    }

    // Apply filters
    let filteredLeads = allLeads;

    if (statusFilter) {
      filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
    }

    if (clientFilter) {
      if (clientFilter === 'unassigned') {
        filteredLeads = filteredLeads.filter(lead => lead.assignedClient === 'Unassigned');
      } else {
        filteredLeads = filteredLeads.filter(lead => lead.assignedClientId === clientFilter);
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredLeads = filteredLeads.filter(lead =>
        lead.companyName.toLowerCase().includes(term) ||
        lead.contactName.toLowerCase().includes(term)
      );
    }

    return new Response(
      JSON.stringify({ leads: filteredLeads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-all-leads-admin function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});