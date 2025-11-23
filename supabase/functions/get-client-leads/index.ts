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

    console.log('Authorization header present');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Unauthorized: ${authError.message}`);
    }
    
    if (!user) {
      console.error('No user found');
      throw new Error('Unauthorized: No user found');
    }

    console.log('Fetching leads for user:', user.id);

    // Get Notion API key
    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    if (!notionApiKey) {
      throw new Error('NOTION_API_KEY not configured');
    }

    // Check if user is admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    console.log('User is admin:', isAdmin);

    if (isAdmin) {
      // Admin can see all leads from all clients
      const { data: allProfiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('notion_database_id');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw new Error('Failed to get profiles');
      }

      const allLeads: any[] = [];
      
      // Fetch leads from all databases
      for (const profile of allProfiles || []) {
        if (profile.notion_database_id) {
          try {
            const notionResponse = await fetch(
              `https://api.notion.com/v1/databases/${profile.notion_database_id}/query`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${notionApiKey}`,
                  'Notion-Version': '2022-06-28',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ page_size: 100 })
              }
            );

            if (notionResponse.ok) {
              const notionData = await notionResponse.json();
              const leads = notionData.results.map((page: any) => {
                const props = page.properties;
                return {
                  id: page.id,
                  status: props.Status?.select?.name || 'Unknown',
                  companyName: props['Company Name']?.title?.[0]?.plain_text || 'N/A',
                  contactName: props['Contact Name']?.rich_text?.[0]?.plain_text || 'N/A',
                  jobTitle: props['Job Title']?.rich_text?.[0]?.plain_text || 'N/A',
                  industry: props.Industry?.select?.name || 'N/A',
                  companySize: props['Company Size']?.select?.name || 'N/A',
                  dateAdded: props['Date Added']?.date?.start || page.created_time,
                };
              });
              allLeads.push(...leads);
            }
          } catch (err) {
            console.error('Error fetching from database:', profile.notion_database_id, err);
          }
        }
      }

      console.log('Admin fetched total leads:', allLeads.length);
      return new Response(
        JSON.stringify({ leads: allLeads }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular client flow - get user's Notion database ID from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('notion_database_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Failed to get user profile');
    }

    if (!profile?.notion_database_id) {
      console.log('No Notion database ID configured for user');
      throw new Error('No Notion database configured for your account. Please contact your administrator.');
    }

    console.log('Fetching from Notion database:', profile.notion_database_id);

    const notionResponse = await fetch(
      `https://api.notion.com/v1/databases/${profile.notion_database_id}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_size: 100
        })
      }
    );

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error('Notion API error:', errorText);
      throw new Error(`Notion API error: ${notionResponse.status}`);
    }

    const notionData = await notionResponse.json();
    console.log('Notion response pages:', notionData.results?.length || 0);

    // Transform Notion data to our format
    const leads = notionData.results.map((page: any) => {
      const props = page.properties;
      
      return {
        id: page.id,
        status: props.Status?.select?.name || 'Unknown',
        companyName: props['Company Name']?.title?.[0]?.plain_text || 'N/A',
        contactName: props['Contact Name']?.rich_text?.[0]?.plain_text || 'N/A',
        jobTitle: props['Job Title']?.rich_text?.[0]?.plain_text || 'N/A',
        industry: props.Industry?.select?.name || 'N/A',
        companySize: props['Company Size']?.select?.name || 'N/A',
        dateAdded: props['Date Added']?.date?.start || page.created_time,
      };
    });

    console.log('Transformed leads:', leads.length);

    return new Response(
      JSON.stringify({ leads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-client-leads:', error);
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