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

    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    const mainDatabaseId = Deno.env.get('MAIN_NOTION_DATABASE_ID');

    if (!notionApiKey || !mainDatabaseId) {
      console.error('Missing Notion configuration');
      return new Response(
        JSON.stringify({ error: 'Notion configuration not set up' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get total clients
    const { count: totalClients, error: clientsError } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get clients with databases
    const { count: clientsWithDatabases, error: dbError } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('notion_database_id', 'is', null);

    // Get all client databases
    const { data: clients, error: clientsFetchError } = await supabaseClient
      .from('profiles')
      .select('notion_database_id')
      .not('notion_database_id', 'is', null);

    let totalLeads = 0;
    const statusCounts = {
      Qualified: 0,
      'In Progress': 0,
      Booked: 0,
      Approved: 0,
      Rejected: 0,
    };

    // Query main database
    const databases = [mainDatabaseId, ...(clients?.map(c => c.notion_database_id) || [])];

    for (const dbId of databases) {
      try {
        const notionResponse = await fetch(
          `https://api.notion.com/v1/databases/${dbId}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${notionApiKey}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ page_size: 100 }),
          }
        );

        if (notionResponse.ok) {
          const data = await notionResponse.json();
          totalLeads += data.results.length;

          // Count by status
          data.results.forEach((page: any) => {
            const status = page.properties['Status']?.select?.name as keyof typeof statusCounts;
            if (status && statusCounts[status] !== undefined) {
              statusCounts[status]++;
            }
          });
        }
      } catch (error) {
        console.error(`Error querying database ${dbId}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        totalClients: totalClients || 0,
        clientsWithDatabases: clientsWithDatabases || 0,
        totalLeads,
        statusBreakdown: statusCounts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-system-stats function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});