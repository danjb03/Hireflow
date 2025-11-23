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
      throw new Error('Unauthorized: No authorization header');
    }

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

    // Verify user is admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id,
    });

    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { databaseId } = await req.json();

    if (!databaseId) {
      throw new Error('Database ID is required');
    }

    // Format database ID with hyphens if needed
    const formattedDatabaseId = databaseId.includes('-') 
      ? databaseId 
      : databaseId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

    console.log('Validating database:', formattedDatabaseId);

    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    if (!notionApiKey) {
      throw new Error('NOTION_API_KEY not configured');
    }

    // First, fetch database metadata to get the name
    const dbMetadataResponse = await fetch(
      `https://api.notion.com/v1/databases/${formattedDatabaseId}`,
      {
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
        },
      }
    );

    let databaseName = 'Notion Database';
    if (dbMetadataResponse.ok) {
      const dbMetadata = await dbMetadataResponse.json();
      databaseName = dbMetadata.title?.[0]?.plain_text || 'Notion Database';
      console.log('Fetched database name:', databaseName);
    }

    // Try to query the database to validate access
    const notionResponse = await fetch(
      `https://api.notion.com/v1/databases/${formattedDatabaseId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 1 })
      }
    );

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json();
      console.error('Notion API error:', errorData);
      
      let errorMessage = 'Unable to access this Notion database';
      
      if (notionResponse.status === 404) {
        errorMessage = 'Database not found. Make sure:\n1. The database ID is correct\n2. The database is shared with your integration\n3. You clicked "Save" after sharing';
      } else if (notionResponse.status === 401) {
        errorMessage = 'Invalid Notion API key. Please check your integration secret.';
      }
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: errorMessage,
          details: errorData.message
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await notionResponse.json();
    console.log('Database validation successful, found pages:', data.results?.length || 0);

    return new Response(
      JSON.stringify({ 
        valid: true, 
        databaseName,
        pageCount: data.results?.length || 0,
        message: 'Database is accessible and properly configured'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in validate-notion-database:', error);
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: error.message 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});