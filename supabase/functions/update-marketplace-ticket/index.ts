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

    const { ticketId, status, adminNotes } = await req.json();

    if (!ticketId) throw new Error('Ticket ID is required');

    // Validate status if provided
    const validStatuses = ['new', 'contacted', 'qualified', 'closed'];
    if (status && !validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build update object
    const updateData: Record<string, any> = {};
    if (status !== undefined) {
      updateData.status = status;
      // Set contacted_at when status changes to contacted
      if (status === 'contacted') {
        updateData.contacted_at = new Date().toISOString();
      }
    }
    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    const { data: ticket, error: updateError } = await supabaseAdmin
      .from('marketplace_interests')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Database error: ${updateError.message}`);
    }

    // Transform to camelCase for frontend
    const transformedTicket = {
      id: ticket.id,
      contactName: ticket.contact_name,
      contactEmail: ticket.contact_email,
      contactPhone: ticket.contact_phone,
      companyName: ticket.company_name,
      message: ticket.message,
      leadId: ticket.lead_id,
      leadSummary: ticket.lead_summary,
      status: ticket.status,
      closeOpportunityId: ticket.close_opportunity_id,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      contactedAt: ticket.contacted_at,
      adminNotes: ticket.admin_notes,
    };

    return new Response(
      JSON.stringify({ success: true, ticket: transformedTicket }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating marketplace ticket:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
