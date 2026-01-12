import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send welcome email via Resend
async function sendWelcomeEmail(email: string, repName: string, tempPassword: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  console.log('RESEND_API_KEY exists:', !!resendApiKey);
  console.log('Attempting to send email to:', email);

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const loginUrl = 'https://hireflow.uk';

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
      subject: `Welcome to Hireflow - Your Rep Account is Ready`,
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
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 40px 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -1px;">
                Hireflow
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">
                Sales Rep Portal
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">

              <!-- Welcome Message -->
              <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 24px; font-weight: 600;">
                Welcome to the team, ${repName}!
              </h2>
              <p style="margin: 0 0 24px; color: #64748b; font-size: 16px; line-height: 1.6;">
                Your Hireflow rep account has been created. You can now access your portal to view leads, submit reports, and track your performance.
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
                          <code style="display: inline-block; margin-top: 4px; background: #1e293b; color: #3b82f6; padding: 8px 16px; border-radius: 6px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">${tempPassword}</code>
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
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                      Access Your Portal
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's Next Section -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px; font-weight: 600;">
                      What you can do in your portal:
                    </p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #dbeafe; color: #3b82f6; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">1</span>
                        </td>
                        <td style="padding: 8px 0 8px 12px; color: #475569; font-size: 14px; line-height: 1.5;">
                          View and manage leads for your allocated clients
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #dbeafe; color: #3b82f6; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">2</span>
                        </td>
                        <td style="padding: 8px 0 8px 12px; color: #475569; font-size: 14px; line-height: 1.5;">
                          Submit daily reports with your performance metrics
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #dbeafe; color: #3b82f6; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">3</span>
                        </td>
                        <td style="padding: 8px 0 8px 12px; color: #475569; font-size: 14px; line-height: 1.5;">
                          Submit new leads directly from the portal
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
                Sales Rep Portal
              </p>
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                Need help? Contact your manager or reply to this email.<br>
                <a href="https://app.hireflow.uk" style="color: #3b82f6; text-decoration: none;">app.hireflow.uk</a>
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
    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Use admin client to check roles (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user is admin using admin client
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { email, repName, airtableRepId } = await req.json();

    if (!email || !repName) throw new Error('Email and rep name are required');
    if (!airtableRepId) throw new Error('Airtable rep selection is required');

    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (signUpError) throw signUpError;

    if (authData.user) {
      // Create profile linked to Airtable rep
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: authData.user.id,
          email: email,
          client_name: repName, // Using client_name field for rep name
          airtable_rep_id: airtableRepId,
          initial_password: tempPassword
        }, { onConflict: 'id' });

      // Assign "rep" role in user_roles
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: "rep" });

      // Send welcome email with credentials
      const emailResult = await sendWelcomeEmail(email, repName, tempPassword);
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
