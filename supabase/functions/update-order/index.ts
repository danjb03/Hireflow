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
      throw new Error('Only admins can update orders');
    }

    // Get request body
    const {
      order_id,
      order_number,
      name,
      description,
      leads_purchased,
      target_delivery_date,
      start_date,
      completion_date,
      status,
      priority,
    } = await req.json();

    if (!order_id) {
      throw new Error('order_id is required');
    }

    // Get current order to check constraints
    const { data: currentOrder, error: currentError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (currentError || !currentOrder) {
      throw new Error('Order not found');
    }

    // Build update object
    const updates: any = {};

    if (order_number !== undefined) {
      // Check if new order_number conflicts with existing
      if (order_number !== currentOrder.order_number) {
        const { data: existing } = await supabaseClient
          .from('orders')
          .select('id')
          .eq('order_number', order_number)
          .single();

        if (existing) {
          throw new Error('Order number already exists');
        }
      }
      updates.order_number = order_number;
    }

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (target_delivery_date !== undefined) updates.target_delivery_date = target_delivery_date;
    if (start_date !== undefined) updates.start_date = start_date;
    if (completion_date !== undefined) updates.completion_date = completion_date;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;

    // Validate leads_purchased can't be less than leads_delivered
    if (leads_purchased !== undefined) {
      const newLeadsPurchased = parseInt(leads_purchased);
      if (newLeadsPurchased < currentOrder.leads_delivered) {
        throw new Error(`Cannot set leads_purchased to ${newLeadsPurchased} because ${currentOrder.leads_delivered} leads have already been delivered`);
      }
      updates.leads_purchased = newLeadsPurchased;
    }

    // Update order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .update(updates)
      .eq('id', order_id)
      .select()
      .single();

    if (orderError) throw orderError;

    return new Response(
      JSON.stringify({ order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

