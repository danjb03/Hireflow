import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send new lead notification email via Resend
async function sendNewLeadEmail(
  clientEmail: string,
  clientName: string,
  companyName: string,
  leadId: string
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const dashboardUrl = 'https://app.hireflow.uk/client/leads';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hireflow <team@app.hireflow.uk>',
      to: [clientEmail],
      subject: `New Lead Available: ${companyName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead Available</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -1px;">
                Hireflow
              </h1>
            </td>
          </tr>

          <!-- Notification Badge -->
          <tr>
            <td style="background-color: #ffffff; padding: 0; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 24px 40px 0;">
                    <span style="display: inline-block; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #166534; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      New Lead Available
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px 40px 40px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">

              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
                Hi ${clientName}, a new qualified lead has been added to your account.
              </p>

              <!-- Lead Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px; padding: 28px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Company
                    </p>
                    <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                      ${companyName}
                    </h2>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                This lead matches your requirements and is ready for you to connect with. Log in to view the full contact details and company information.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      View Lead Details
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1e293b; padding: 24px 40px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 8px; color: #ffffff; font-size: 16px; font-weight: 600;">
                Hireflow
              </p>
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                Premium Lead Generation for Recruitment Agencies<br>
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

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Resend API error:', errorBody);
    return { success: false, error: errorBody };
  }

  const result = await response.json();
  console.log('New lead email sent successfully:', result.id);
  return { success: true, emailId: result.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Unauthorized: ${authError.message}`);
    }
    if (!user) {
      throw new Error('Unauthorized: No user found');
    }

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    // Now we receive the Airtable client ID directly from the frontend
    const { leadId, airtableClientId } = await req.json();
    if (!leadId) throw new Error('Lead ID is required');
    // airtableClientId can be empty/null for unassigning

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    const isUnassigning = !airtableClientId;
    console.log(isUnassigning ? 'Unassigning lead:' : 'Assigning lead:', leadId, isUnassigning ? '' : 'to Airtable client: ' + airtableClientId);

    // Directly update the lead with the Airtable client ID (or empty array to unassign)
    const tableName = encodeURIComponent('Qualified Lead Table');
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${leadId}`;

    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { 'Clients': isUnassigning ? [] : [airtableClientId] }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Airtable API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: airtableUrl,
        airtableClientId
      });

      // Parse error for user-friendly message
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error?.type === 'ROW_DOES_NOT_EXIST') {
          throw new Error('Lead or Client not found in Airtable. Please refresh the page.');
        }
        if (errorJson.error?.type === 'INVALID_REQUEST_UNKNOWN') {
          throw new Error('Invalid Airtable field. Check that the Clients field exists.');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('Please')) {
          throw parseError;
        }
      }

      throw new Error(`Failed to assign lead in Airtable: ${response.status}`);
    }

    const result = await response.json();
    console.log(isUnassigning ? 'Successfully unassigned lead:' : 'Successfully assigned lead:', result.id, isUnassigning ? '' : 'to client: ' + airtableClientId);

    // Only send email notification when assigning (not unassigning)
    if (!isUnassigning) {
      // Get lead details for the email (company name)
      const companyName = result.fields?.['Company Name'] || 'New Lead';

      // Look up ALL profiles for this client
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: clientProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, client_name')
        .eq('airtable_client_id', airtableClientId);

      if (clientProfiles && clientProfiles.length > 0) {
        // Get notification preferences for these users
        const userIds = clientProfiles.map(p => p.id);
        const { data: preferences } = await supabaseAdmin
          .from('notification_preferences')
          .select('user_id, lead_notifications_enabled')
          .in('user_id', userIds);

        // Create a map for quick lookup
        const prefsMap = new Map<string, boolean>();
        for (const pref of preferences || []) {
          prefsMap.set(pref.user_id, pref.lead_notifications_enabled);
        }

        // Send email to each user who has notifications enabled
        for (const profile of clientProfiles) {
          // Default to true if no preference record exists
          const notificationsEnabled = prefsMap.get(profile.id) ?? true;

          if (!notificationsEnabled) {
            console.log(`Skipping email for user ${profile.id} - notifications disabled`);
            continue;
          }

          // Get user email
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);

          if (userData?.user?.email) {
            const emailResult = await sendNewLeadEmail(
              userData.user.email,
              profile.client_name || 'Client',
              companyName,
              leadId
            );
            console.log(`Email sent to ${userData.user.email}:`, emailResult);
          } else {
            console.warn('Could not find email for client profile:', profile.id);
          }
        }
      } else {
        console.warn('No Supabase profiles found for Airtable client:', airtableClientId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, unassigned: isUnassigning }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error assigning lead to client:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
