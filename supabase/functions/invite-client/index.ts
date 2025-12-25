import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send welcome email via Resend
async function sendWelcomeEmail(email: string, clientName: string, tempPassword: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const loginUrl = 'https://app.hireflow.co.uk/login'; // Update this to your actual domain

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hireflow <noreply@hireflow.co.uk>', // Update to your verified domain
      to: [email],
      subject: `Welcome to Hireflow, ${clientName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Welcome to Hireflow!</h1>
          <p>Hi ${clientName},</p>
          <p>Your Hireflow account has been created. Here are your login details:</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
          </div>

          <p>Please change your password after your first login.</p>

          <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Login to Hireflow
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact your account manager.
          </p>

          <p>Best regards,<br>The Hireflow Team</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Resend API error:', errorBody);
    return { success: false, error: errorBody };
  }

  const result = await response.json();
  console.log('Email sent successfully:', result.id);
  return { success: true, emailId: result.id };
}

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
      airtableClientId,
      leadsPurchased,
      onboardingDate,
      targetDeliveryDate,
      leadsPerDay,
      clientStatus
    } = await req.json();

    if (!email || !clientName) throw new Error('Email and client name are required');
    if (!airtableClientId) throw new Error('Airtable client selection is required');

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
        airtable_client_id: airtableClientId,
        onboarding_completed: true, // Mark as completed since we're linking to Airtable
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

      // Send welcome email with credentials
      const emailResult = await sendWelcomeEmail(email, clientName, tempPassword);
      console.log('Email result:', emailResult);
    }

    return new Response(
      JSON.stringify({ success: true, tempPassword, userId: authData.user.id, emailSent: true }),
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
