import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get order ID from request body
    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin') || false;

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        clients:client_id (
          id,
          client_name,
          email
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('Order not found');

    // Check permissions - clients can only view their own orders
    if (!isAdmin) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('client_name')
        .eq('id', user.id)
        .single();

      if (profile?.client_name) {
        const { data: client } = await supabaseClient
          .from('clients')
          .select('id, client_name')
          .eq('client_name', profile.client_name)
          .single();

        if (!client || client.id !== order.client_id) {
          throw new Error('Access denied');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    // Get leads assigned to this order
    const { data: leads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('order_id', orderId)
      .order('date_created', { ascending: false });

    if (leadsError) throw leadsError;

    // Calculate stats
    const stats = {
      total_leads: leads?.length || 0,
      approved_leads: leads?.filter(l => l.status === 'Approved').length || 0,
      lead_status: leads?.filter(l => l.status === 'Lead').length || 0,
      new_leads: leads?.filter(l => l.status === 'New').length || 0,
      rejected_leads: leads?.filter(l => l.status === 'Rejected').length || 0,
      completion_percentage: order.leads_purchased > 0
        ? Math.round((order.leads_delivered / order.leads_purchased) * 100 * 10) / 10
        : 0,
      days_remaining: order.target_delivery_date
        ? Math.ceil((new Date(order.target_delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null,
    };

    return new Response(
      JSON.stringify({
        order: {
          ...order,
          ...stats,
        },
        leads: leads || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching order details:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

