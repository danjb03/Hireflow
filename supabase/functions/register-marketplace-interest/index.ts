import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send notification email to team via Resend
async function sendNotificationEmail(interest: {
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string;
  message: string | null;
  leadSummary: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  // Team emails to notify
  const teamEmails = [
    'daniel@hireflow.uk',
    'roman@tnemarketing.com',
    'connor@hireflow.uk'
  ];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hireflow <team@app.hireflow.uk>',
      to: teamEmails,
      subject: `New Marketplace Interest: ${interest.companyName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                New Marketplace Interest
              </h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                Someone has expressed interest in a marketplace lead:
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Lead</p>
                    <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">${interest.leadSummary}</p>
                  </td>
                </tr>
              </table>

              <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 16px; font-weight: 600;">Contact Details</h3>

              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Name:</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500; margin-left: 8px;">${interest.contactName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Company:</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500; margin-left: 8px;">${interest.companyName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Email:</span>
                    <a href="mailto:${interest.contactEmail}" style="color: #8b5cf6; font-size: 14px; font-weight: 500; margin-left: 8px;">${interest.contactEmail}</a>
                  </td>
                </tr>
                ${interest.contactPhone ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Phone:</span>
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500; margin-left: 8px;">${interest.contactPhone}</span>
                  </td>
                </tr>
                ` : ''}
              </table>

              ${interest.message ? `
              <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Message</p>
                <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6;">${interest.message}</p>
              </div>
              ` : ''}

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="https://hireflow.uk/admin/marketplace" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                      View in Admin
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1e293b; padding: 24px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Hireflow Marketplace Notification
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
    console.error('Resend API error:', response.status, errorBody);
    return { success: false, error: errorBody };
  }

  const result = await response.json();
  return { success: true, emailId: result.id };
}

// Send confirmation email to the person who registered interest
async function sendConfirmationEmail(interest: {
  contactName: string;
  contactEmail: string;
  companyName: string;
  leadSummary: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured, skipping confirmation email');
    return { success: false, error: 'Email not configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hireflow <team@app.hireflow.uk>',
      to: [interest.contactEmail],
      subject: 'Thanks for your interest in this lead',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 32px 20px;">
        <table role="presentation" style="width: 100%; max-width: 560px; border-collapse: collapse;">
          <tr>
            <td style="background: #0f172a; padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Thanks for your interest</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">
                Hi ${interest.contactName}, thanks for registering interest in the lead below. One of our team will be in touch shortly to help you with next steps.
              </p>
              <div style="padding: 16px; background: #f8fafc; border-radius: 10px;">
                <p style="margin: 0 0 6px; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Lead</p>
                <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">${interest.leadSummary}</p>
                <p style="margin: 6px 0 0; color: #475569; font-size: 14px;">${interest.companyName}</p>
              </div>
              <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
                If you have any questions, just reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1e293b; padding: 16px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Hireflow Marketplace</p>
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
    console.error('Resend confirmation error:', response.status, errorBody);
    return { success: false, error: errorBody };
  }

  const result = await response.json();
  return { success: true, emailId: result.id };
}

// Create opportunity in Close.com
async function createCloseOpportunity(interest: {
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string;
  message: string | null;
  leadSummary: string;
}) {
  const closeApiKey = Deno.env.get('CLOSE_API_KEY');

  if (!closeApiKey) {
    console.log('CLOSE_API_KEY not configured, skipping Close.com integration');
    return { success: false, error: 'Close.com not configured' };
  }

  const authHeader = 'Basic ' + btoa(closeApiKey + ':');

  try {
    // First, create a lead in Close
    const leadResponse = await fetch('https://api.close.com/api/v1/lead/', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: interest.companyName,
        contacts: [
          {
            name: interest.contactName,
            emails: [{ email: interest.contactEmail, type: 'office' }],
            phones: interest.contactPhone ? [{ phone: interest.contactPhone, type: 'office' }] : [],
          }
        ],
        custom: {
          'Source': 'Marketplace',
          'Interest': interest.leadSummary,
        }
      })
    });

    if (!leadResponse.ok) {
      const errorText = await leadResponse.text();
      console.error('Close.com lead creation error:', leadResponse.status, errorText);
      return { success: false, error: errorText };
    }

    const leadData = await leadResponse.json();
    const closeLeadId = leadData.id;

    // Create an opportunity with "Platform Leads" status
    const oppResponse = await fetch('https://api.close.com/api/v1/opportunity/', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead_id: closeLeadId,
        note: `Marketplace Interest\n\nLead: ${interest.leadSummary}\n\n${interest.message ? `Message: ${interest.message}` : ''}`,
        status_label: 'Platform Leads',
      })
    });

    if (!oppResponse.ok) {
      const errorText = await oppResponse.text();
      console.error('Close.com opportunity creation error:', oppResponse.status, errorText);
      return { success: true, leadId: closeLeadId, opportunityError: errorText };
    }

    const oppData = await oppResponse.json();
    return { success: true, leadId: closeLeadId, opportunityId: oppData.id };

  } catch (error) {
    console.error('Close.com integration error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      contactName,
      contactEmail,
      contactPhone,
      companyName,
      message,
      leadId,
      leadSummary
    } = await req.json();

    // Validate required fields
    if (!contactName) throw new Error('Contact name is required');
    if (!contactEmail) throw new Error('Contact email is required');
    if (!companyName) throw new Error('Company name is required');
    if (!leadId) throw new Error('Lead ID is required');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      throw new Error('Invalid email address');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create Close.com opportunity
    const closeResult = await createCloseOpportunity({
      contactName,
      contactEmail,
      contactPhone,
      companyName,
      message,
      leadSummary: leadSummary || 'Marketplace Lead'
    });

    // Insert into marketplace_interests table
    const { data: interestData, error: insertError } = await supabaseAdmin
      .from('marketplace_interests')
      .insert({
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        company_name: companyName,
        message: message || null,
        lead_id: leadId,
        lead_summary: leadSummary || null,
        status: 'new',
        close_opportunity_id: closeResult.opportunityId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting marketplace interest:', insertError);
      throw new Error('Failed to save interest');
    }

    // Send notification email
    const emailResult = await sendNotificationEmail({
      contactName,
      contactEmail,
      contactPhone,
      companyName,
      message,
      leadSummary: leadSummary || 'Marketplace Lead'
    });

    const confirmationResult = await sendConfirmationEmail({
      contactName,
      contactEmail,
      companyName,
      leadSummary: leadSummary || 'Marketplace Lead'
    });

    return new Response(
      JSON.stringify({
        success: true,
        interestId: interestData.id,
        emailSent: emailResult.success,
        confirmationSent: confirmationResult.success,
        closeCreated: closeResult.success,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error registering marketplace interest:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
