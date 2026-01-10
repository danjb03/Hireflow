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

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin') || false;

    // Get order ID from URL
    const url = new URL(req.url);
    const orderId = url.searchParams.get('id');
    if (!orderId) throw new Error('Order ID required');

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch order with client info
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        profiles:client_id (
          id,
          client_name,
          email
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (!orderData) throw new Error('Order not found');

    // Check access: admins can see all, clients can only see their own
    if (!isAdmin && orderData.client_id !== user.id) {
      throw new Error('Access denied');
    }

    // Fetch associated leads
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, company_name, status, email, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    }

    const completionPercentage = orderData.leads_purchased > 0
      ? Math.round((orderData.leads_delivered / orderData.leads_purchased) * 100)
      : 0;

    let daysRemaining = null;
    if (orderData.target_delivery_date) {
      const targetDate = new Date(orderData.target_delivery_date);
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return new Response(
      JSON.stringify({
        order: {
          ...orderData,
          client_name: orderData.profiles?.client_name || 'Unknown',
          completion_percentage: completionPercentage,
          days_remaining: daysRemaining,
        },
        leads: leads || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-order-details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

