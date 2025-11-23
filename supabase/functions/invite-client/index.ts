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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, databaseId } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    if (!databaseId) {
      throw new Error('Notion Database ID is required');
    }

    console.log('Creating client account for:', email);

    // Fetch Notion database name
    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    if (!notionApiKey) {
      throw new Error('NOTION_API_KEY not configured');
    }

    // Format database ID with hyphens if needed
    const formattedDbId = databaseId.includes('-') 
      ? databaseId 
      : databaseId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

    let databaseName = 'Client';
    try {
      const notionResponse = await fetch(
        `https://api.notion.com/v1/databases/${formattedDbId}`,
        {
          headers: {
            'Authorization': `Bearer ${notionApiKey}`,
            'Notion-Version': '2022-06-28',
          },
        }
      );

      if (notionResponse.ok) {
        const dbData = await notionResponse.json();
        databaseName = dbData.title?.[0]?.plain_text || 'Client';
        console.log('Fetched database name:', databaseName);
      }
    } catch (error) {
      console.error('Failed to fetch database name:', error);
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

    // Create the user account
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      throw signUpError;
    }

    console.log('User created:', authData.user.id);

    // Update profile with database ID and initial password
    if (authData.user) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          notion_database_id: formattedDbId,
          initial_password: tempPassword
        })
        .eq("id", authData.user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }
      console.log('Profile updated with database ID and password');
    }

    // Assign client role
    if (authData.user) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: "client" });

      if (roleError) {
        console.error('Role assignment error:', roleError);
        throw roleError;
      }
      console.log('Client role assigned');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        userId: authData.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in invite-client function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
