import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();

    if (!email) throw new Error('Email is required');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

    // Create auth user
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (signUpError) throw signUpError;

    if (authData.user) {
      // Create profile
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: authData.user.id,
          email: email,
          client_name: name || email.split('@')[0],
        }, { onConflict: 'id' });

      // Assign "admin" role
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: "admin" });
    }

    return new Response(
      JSON.stringify({ success: true, tempPassword, userId: authData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
