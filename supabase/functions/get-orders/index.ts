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

    let query = supabaseClient
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

    // If not admin, only show orders for their client
    if (!isAdmin) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('client_name')
        .eq('id', user.id)
        .single();

      if (profile?.client_name) {
        const { data: client } = await supabaseClient
          .from('clients')
          .select('id')
          .eq('client_name', profile.client_name)
          .single();

        if (client) {
          query = query.eq('client_id', client.id);
        } else {
          // No client found, return empty
          return new Response(
            JSON.stringify({ orders: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // No client_name, return empty
        return new Response(
          JSON.stringify({ orders: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Calculate completion percentage for each order
    const ordersWithStats = orders?.map(order => ({
      ...order,
      completion_percentage: order.leads_purchased > 0
        ? Math.round((order.leads_delivered / order.leads_purchased) * 100 * 10) / 10
        : 0,
      days_remaining: order.target_delivery_date
        ? Math.ceil((new Date(order.target_delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null,
    })) || [];

    return new Response(
      JSON.stringify({ orders: ordersWithStats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching orders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

