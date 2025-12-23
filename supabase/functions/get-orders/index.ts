import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Get query parameters
    const url = new URL(req.url);
    const clientId = url.searchParams.get('client_id');
    const status = url.searchParams.get('status');

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        clients:client_id (
          id,
          client_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // If not admin, filter by client
    if (!isAdmin) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('client_name')
        .eq('id', user.id)
        .single();

      if (profile?.client_name) {
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('client_name', profile.client_name)
          .single();

        if (client) {
          query = query.eq('client_id', client.id);
        } else {
          return new Response(
            JSON.stringify({ orders: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ orders: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    // Calculate completion percentage and days remaining
    const ordersWithStats = (orders || []).map((order: any) => {
      const completionPercentage = order.leads_purchased > 0
        ? Math.round((order.leads_delivered / order.leads_purchased) * 100)
        : 0;

      let daysRemaining = null;
      if (order.target_delivery_date) {
        const targetDate = new Date(order.target_delivery_date);
        const today = new Date();
        const diffTime = targetDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...order,
        completion_percentage: completionPercentage,
        days_remaining: daysRemaining,
        client_name: order.clients?.client_name || 'Unknown',
      };
    });

    return new Response(
      JSON.stringify({ orders: ordersWithStats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

