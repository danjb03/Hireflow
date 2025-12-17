import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Resetting password for user:', userId);

    // Generate new temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

    // Update the user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (error) {
      console.error('Password reset error:', error);
      throw error;
    }

    console.log('Password reset successful for user:', userId);

    // Update profile with new password for reference
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ initial_password: tempPassword })
      .eq("id", userId);

    if (updateError) {
      console.error('Failed to update password in profile:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in reset-client-password function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
