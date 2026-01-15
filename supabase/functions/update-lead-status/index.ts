import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send approval notification email via Resend
async function sendApprovalEmail(
  clientEmail: string,
  clientName: string,
  leadDetails: {
    companyName: string;
    contactName: string | null;
    jobTitle: string | null;
    callback1: string | null;
    callback2: string | null;
    callback3: string | null;
  },
  leadId: string
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const dashboardUrl = `https://app.hireflow.uk/client/leads/${leadId}`;

  // Format callback times for display
  const formatCallback = (isoDate: string | null): string | null => {
    if (!isoDate) return null;
    try {
      const date = new Date(isoDate);
      return date.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London'
      });
    } catch {
      return null;
    }
  };

  const callbacks = [
    formatCallback(leadDetails.callback1),
    formatCallback(leadDetails.callback2),
    formatCallback(leadDetails.callback3)
  ].filter(Boolean);

  const callbacksHtml = callbacks.length > 0
    ? `
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="background-color: #fef3c7; border-radius: 8px; padding: 16px;">
            <p style="margin: 0 0 8px; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Suggested Callback Times
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
              ${callbacks.map(cb => `<li>${cb}</li>`).join('')}
            </ul>
          </td>
        </tr>
      </table>
    `
    : '';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hireflow <team@app.hireflow.uk>',
      to: [clientEmail],
      subject: `Lead Approved: ${leadDetails.companyName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lead Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 40px 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -1px;">
                Hireflow
              </h1>
            </td>
          </tr>

          <!-- Approval Badge -->
          <tr>
            <td style="background-color: #ffffff; padding: 0; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 24px 40px 0;">
                    <span style="display: inline-block; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #166534; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Lead Approved
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
                Hi ${clientName}, great news! A lead has been approved and is ready for you to connect with.
              </p>

              <!-- Lead Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px; padding: 28px;">
                    <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Company
                    </p>
                    <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 24px; font-weight: 700;">
                      ${leadDetails.companyName}
                    </h2>
                    ${leadDetails.contactName ? `
                    <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Contact
                    </p>
                    <p style="margin: 0 0 16px; color: #e2e8f0; font-size: 16px;">
                      ${leadDetails.contactName}
                    </p>
                    ` : ''}
                    ${leadDetails.jobTitle ? `
                    <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Role They're Hiring For
                    </p>
                    <p style="margin: 0; color: #e2e8f0; font-size: 16px;">
                      ${leadDetails.jobTitle}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              ${callbacksHtml}

              <p style="margin: 24px 0; color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                Log in to view full contact details, company information, and notes from our team.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
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
                <a href="https://app.hireflow.uk" style="color: #8b5cf6; text-decoration: none;">app.hireflow.uk</a>
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
  console.log('Approval email sent successfully:', result.id);
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
    if (authError || !user) throw new Error('Unauthorized');

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    const { leadId, status } = await req.json();
    if (!leadId || !status) throw new Error('Lead ID and status required');

    const validStatuses = ['New', 'NEW', 'Lead', 'Approved', 'Rejected', 'Needs Work'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table/${leadId}`;
    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { 'Status': status }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable error:', errorText);
      throw new Error(`Failed to update status: ${response.status}`);
    }

    const updatedRecord = await response.json();
    console.log(`Successfully updated lead ${leadId} status to ${status}`);

    // Send email notification when status changes to "Approved"
    if (status === 'Approved') {
      const fields = updatedRecord.fields || {};
      const clientIds = fields['Clients'] || [];

      if (clientIds.length > 0) {
        const airtableClientId = clientIds[0];
        console.log('Lead approved, sending email to client:', airtableClientId);

        // Look up the client's email from Supabase profiles
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: clientProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, client_name')
          .eq('airtable_client_id', airtableClientId)
          .single();

        if (clientProfile) {
          // Get the user's email from auth
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(clientProfile.id);

          if (userData?.user?.email) {
            const emailResult = await sendApprovalEmail(
              userData.user.email,
              clientProfile.client_name || 'Client',
              {
                companyName: fields['Company Name'] || 'New Lead',
                contactName: fields['Contact Name'] || null,
                jobTitle: fields['Job Title'] || null,
                callback1: fields['Callback 1'] || null,
                callback2: fields['Callback 2'] || null,
                callback3: fields['Callback 3'] || null,
              },
              leadId
            );
            console.log('Email notification result:', emailResult);
          } else {
            console.warn('Could not find email for client profile:', clientProfile.id);
          }
        } else {
          console.warn('No Supabase profile found for Airtable client:', airtableClientId);
        }
      } else {
        console.log('Lead approved but no client assigned, skipping email');
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
