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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { 
      email, 
      clientName, 
      leadsPurchased, 
      onboardingDate, 
      targetDeliveryDate, 
      leadsPerDay,
      clientStatus 
    } = await req.json();
    
    if (!email || !clientName) throw new Error('Email and client name are required');

    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (signUpError) throw signUpError;

    if (authData.user) {
      // Prepare profile update with onboarding data
      const profileUpdate: any = {
        id: authData.user.id,
        client_name: clientName,
        initial_password: tempPassword
      };

      // Add onboarding fields if provided
      if (leadsPurchased !== undefined) profileUpdate.leads_purchased = leadsPurchased;
      if (onboardingDate) profileUpdate.onboarding_date = onboardingDate;
      if (targetDeliveryDate) profileUpdate.target_delivery_date = targetDeliveryDate;
      if (leadsPerDay !== null && leadsPerDay !== undefined) profileUpdate.leads_per_day = leadsPerDay;
      if (clientStatus) profileUpdate.client_status = clientStatus;

      // Use upsert to ensure profile is created/updated with client_name
      await supabaseAdmin
        .from("profiles")
        .upsert(profileUpdate, { onConflict: 'id' });

      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: "client" });
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
