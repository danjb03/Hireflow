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

    const { companyName, companyWebsite, companyLinkedIn, industry, notes } = await req.json();

    if (!companyName || !companyWebsite) {
      return new Response(
        JSON.stringify({ error: 'Company name and website are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Create page in main Notion database
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: mainDatabaseId },
        properties: {
          'Company Name': {
            title: [{ text: { content: companyName } }],
          },
          'Company Website': {
            url: companyWebsite,
          },
          ...(companyLinkedIn && {
            'Company LinkedIn': {
              url: companyLinkedIn,
            },
          }),
          ...(industry && {
            'Industry': {
              select: { name: industry },
            },
          }),
          'Status': {
            select: { name: 'Qualified' },
          },
          ...(notes && {
            'Notes': {
              rich_text: [{ text: { content: notes } }],
          },
          }),
        },
      }),
    });

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json();
      console.error('Notion API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create lead in Notion', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notionData = await notionResponse.json();
    console.log('Lead created successfully:', notionData.id);

    return new Response(
      JSON.stringify({ success: true, leadId: notionData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-lead function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});