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

    // Parse request body for filters
    let statusFilter: string | null = null;
    try {
      const body = await req.json();
      statusFilter = body?.statusFilter || null;
    } catch {
      // No body, fetch all tickets
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build query
    let query = supabaseAdmin
      .from('marketplace_interests')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: tickets, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Database error: ${queryError.message}`);
    }

    // Transform to camelCase for frontend
    const transformedTickets = (tickets || []).map(ticket => ({
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
    }));

    return new Response(
      JSON.stringify({ tickets: transformedTickets }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching marketplace tickets:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
