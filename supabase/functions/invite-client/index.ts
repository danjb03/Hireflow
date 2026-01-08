import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send welcome email via Resend
async function sendWelcomeEmail(email: string, clientName: string, tempPassword: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  console.log('RESEND_API_KEY exists:', !!resendApiKey);
  console.log('Attempting to send email to:', email);

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const loginUrl = 'https://app.hireflow.uk/login';

  console.log('Sending email via Resend...');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hireflow <team@app.hireflow.uk>',
      to: [email],
      subject: `Welcome to Hireflow - Your Account is Ready`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Hireflow</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                Hireflow
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">
                Premium Lead Generation
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">

              <!-- Welcome Message -->
              <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 24px; font-weight: 600;">
                Welcome aboard, ${clientName}!
              </h2>
              <p style="margin: 0 0 24px; color: #64748b; font-size: 16px; line-height: 1.6;">
                Your Hireflow account has been created and is ready to use. You can now access your personalised dashboard to view and manage your leads.
              </p>

              <!-- Credentials Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                    <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Login Credentials
                    </p>

                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: #64748b; font-size: 14px;">Email</span><br>
                          <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="color: #64748b; font-size: 14px;">Temporary Password</span><br>
                          <code style="display: inline-block; margin-top: 4px; background: #1e293b; color: #10b981; padding: 8px 16px; border-radius: 6px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">${tempPassword}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr>
                  <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                      <strong>Security Reminder:</strong> Please change your password after your first login to keep your account secure.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      Access Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's Next Section -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px; font-weight: 600;">
                      What happens next?
                    </p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #dcfce7; color: #10b981; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">1</span>
                        </td>
                        <td style="padding: 8px 0 8px 12px; color: #475569; font-size: 14px; line-height: 1.5;">
                          Log in using the credentials above
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #dcfce7; color: #10b981; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">2</span>
                        </td>
                        <td style="padding: 8px 0 8px 12px; color: #475569; font-size: 14px; line-height: 1.5;">
                          View your qualified leads in your dashboard
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #dcfce7; color: #10b981; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">3</span>
                        </td>
                        <td style="padding: 8px 0 8px 12px; color: #475569; font-size: 14px; line-height: 1.5;">
                          Start connecting with your prospects
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1e293b; padding: 32px 40px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Hireflow
              </p>
              <p style="margin: 0 0 16px; color: #94a3b8; font-size: 13px;">
                Premium Lead Generation for Recruitment Agencies
              </p>
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                Need help? Contact your account manager or reply to this email.<br>
                <a href="https://app.hireflow.uk" style="color: #10b981; text-decoration: none;">app.hireflow.uk</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    }),
  });

  console.log('Resend response status:', response.status);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Resend API error status:', response.status);
    console.error('Resend API error body:', errorBody);
    return { success: false, error: errorBody };
  }

  const result = await response.json();
  console.log('Email sent successfully! ID:', result.id);
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
