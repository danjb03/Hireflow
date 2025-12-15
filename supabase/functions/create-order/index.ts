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

    if (!isAdmin) {
      throw new Error('Only admins can create orders');
    }

    // Get request body
    const {
      client_id,
      order_number,
      name,
      description,
      leads_purchased,
      target_delivery_date,
      start_date,
      status = 'Draft',
    } = await req.json();

    // Validate required fields
    if (!client_id || !order_number || !leads_purchased) {
      throw new Error('client_id, order_number, and leads_purchased are required');
    }

    // Check if order_number already exists
    const { data: existingOrder } = await supabaseClient
      .from('orders')
      .select('id')
      .eq('order_number', order_number)
      .single();

    if (existingOrder) {
      throw new Error('Order number already exists');
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Create order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        client_id,
        order_number,
        name,
        description,
        leads_purchased: parseInt(leads_purchased),
        leads_delivered: 0,
        target_delivery_date,
        start_date,
        status,
        created_by: user.id,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    return new Response(
      JSON.stringify({ order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

