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

    const { leadId, updates } = await req.json();

    if (!leadId || !updates) {
      return new Response(
        JSON.stringify({ error: 'Lead ID and updates are required' }),
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

    // Build Notion properties object from updates
    const properties: any = {};

    if (updates.status) {
      properties['Status'] = { select: { name: updates.status } };
    }
    if (updates.notes) {
      properties['Notes'] = { rich_text: [{ text: { content: updates.notes } }] };
    }
    if (updates.industry) {
      properties['Industry'] = { select: { name: updates.industry } };
    }

    // Update the lead in Notion
    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('Failed to update lead in Notion:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to update lead', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedLead = await updateResponse.json();
    console.log('Lead updated successfully:', leadId);

    return new Response(
      JSON.stringify({ success: true, lead: updatedLead }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-lead function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});