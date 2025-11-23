import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header (check both cases)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('No authorization header found');
      throw new Error('Unauthorized: No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Unauthorized: ${authError.message}`);
    }
    
    if (!user) {
      console.error('No user found');
      throw new Error('Unauthorized: No user found');
    }

    const { leadId } = await req.json();
    
    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    console.log('Fetching lead details for:', leadId);

    // Get user's Notion database ID from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('notion_database_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.notion_database_id) {
      throw new Error('Failed to get user profile');
    }

    // Fetch specific page from Notion
    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    if (!notionApiKey) {
      throw new Error('NOTION_API_KEY not configured');
    }

    const notionResponse = await fetch(
      `https://api.notion.com/v1/pages/${leadId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
        },
      }
    );

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error('Notion API error:', errorText);
      throw new Error(`Notion API error: ${notionResponse.status}`);
    }

    const page = await notionResponse.json();
    const props = page.properties;

    // Transform to detailed format
    const lead = {
      id: page.id,
      status: props.Status?.select?.name || 'Unknown',
      companyName: props['Company Name']?.title?.[0]?.plain_text || 'N/A',
      companyWebsite: props['Company Website']?.url || '',
      industry: props.Industry?.select?.name || 'N/A',
      companySize: props['Company Size']?.select?.name || 'N/A',
      employeeCount: props['Employee Count']?.number?.toString() || '',
      location: props.Location?.rich_text?.[0]?.plain_text || '',
      companyDescription: props['Company Description']?.rich_text?.[0]?.plain_text || '',
      contactName: props['Contact Name']?.rich_text?.[0]?.plain_text || 'N/A',
      jobTitle: props['Job Title']?.rich_text?.[0]?.plain_text || 'N/A',
      email: props.Email?.email || '',
      phone: props.Phone?.phone_number || '',
      linkedInProfile: props['LinkedIn Profile']?.url || '',
      callNotes: props['Call Notes']?.rich_text?.[0]?.plain_text || '',
      jobOpenings: props['Job Openings']?.rich_text?.[0]?.plain_text
        ? JSON.parse(props['Job Openings'].rich_text[0].plain_text)
        : [],
      recordingTranscript: props['Recording Transcript']?.rich_text?.[0]?.plain_text || '',
      dateAdded: props['Date Added']?.date?.start || page.created_time,
    };

    console.log('Lead details fetched successfully');

    return new Response(
      JSON.stringify({ lead }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-lead-details:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});