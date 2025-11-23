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
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

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

    if (!notionApiKey) {
      console.error('Missing Notion API key');
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
    
    // Start with databases to query
    const databasesToQuery = [];
    
    // Add main database if configured
    if (mainDatabaseId) {
      databasesToQuery.push({ 
        id: mainDatabaseId, 
        clientEmail: 'Unassigned', 
        clientId: null 
      });
      console.log('Will query main database:', mainDatabaseId);
    }
    
    // Add all client databases
    databasesToQuery.push(
      ...clients.map(c => ({ 
        id: c.notion_database_id, 
        clientEmail: c.email, 
        clientId: c.id 
      }))
    );

    console.log('Querying', databasesToQuery.length, 'databases total');

    // Helper function to extract text from Notion properties
    const getText = (prop: any) => {
      if (!prop) return '';
      if (prop.title && prop.title[0]) return prop.title[0].plain_text;
      if (prop.rich_text && prop.rich_text[0]) return prop.rich_text[0].plain_text;
      return '';
    };

    for (const db of databasesToQuery) {
      try {
        // Format database ID with hyphens if needed
        const formattedDbId = db.id.includes('-') 
          ? db.id 
          : db.id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        
        console.log('Querying database:', formattedDbId, 'for client:', db.clientEmail);

        const notionResponse = await fetch(
          `https://api.notion.com/v1/databases/${formattedDbId}/query`,
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
          console.log('Database', formattedDbId, 'returned', data.results.length, 'pages');
          
          const leads = data.results.map((page: any) => {
            const props = page.properties;
            
            // Extract company name from various possible fields
            const companyName = 
              getText(props.Name) || 
              getText(props.Title) || 
              getText(props['Company Name']) ||
              (props['Company Website']?.url ? new URL(props['Company Website'].url).hostname.replace('www.', '') : '') ||
              'Company Name Not Available';
            
            return {
              id: page.id,
              companyName,
              contactName: getText(props['Contact Name']) || 'Not available',
              status: props.Status?.select?.name || 'Unknown',
              assignedClient: db.clientEmail,
              assignedClientId: db.clientId,
              industry: props.Industry?.select?.name || getText(props.Industry) || 'Not available',
              dateAdded: page.created_time,
              companyWebsite: props['Company Website']?.url || '',
              companiesLinkedIn: props['Companies Linkedin']?.url || '',
              contactLinkedIn: props["Contact's Linkedin"]?.url || '',
              title: getText(props.Title) || 'Not available',
              phone: props.Phone?.phone_number || getText(props.Phone) || 'Not available',
            };
          });
          
          allLeads.push(...leads);
        } else {
          const errorText = await notionResponse.text();
          console.error('Notion API error for database', formattedDbId, ':', notionResponse.status, errorText);
        }
      } catch (error) {
        console.error(`Error fetching from database ${db.id}:`, error);
      }
    }

    console.log('Total leads fetched:', allLeads.length);

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