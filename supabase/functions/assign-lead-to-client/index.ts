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

    const { leadId, clientId } = await req.json();

    if (!leadId || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID and Client ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notionApiKey = Deno.env.get('NOTION_API_KEY');

    if (!notionApiKey) {
      console.error('Missing Notion API key');
      return new Response(
        JSON.stringify({ error: 'Notion configuration not set up' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client's database ID
    const { data: client, error: clientError } = await supabaseClient
      .from('profiles')
      .select('notion_database_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client?.notion_database_id) {
      console.error('Client not found or no database configured:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client database not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the lead from Notion
    const leadResponse = await fetch(`https://api.notion.com/v1/pages/${leadId}`, {
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!leadResponse.ok) {
      console.error('Failed to fetch lead from Notion');
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const leadData = await leadResponse.json();

    // Copy lead to client's database
    const copyResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: client.notion_database_id },
        properties: leadData.properties,
      }),
    });

    if (!copyResponse.ok) {
      const errorData = await copyResponse.json();
      console.error('Failed to copy lead to client database:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to assign lead to client', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const copiedLead = await copyResponse.json();
    console.log('Lead assigned successfully:', copiedLead.id);

    return new Response(
      JSON.stringify({ success: true, newLeadId: copiedLead.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in assign-lead-to-client function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});