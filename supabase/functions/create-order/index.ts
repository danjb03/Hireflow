import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    if (!isAdmin) throw new Error('Admin access required');

    const {
      order_number,
      client_id,
      name,
      description,
      leads_purchased,
      target_delivery_date,
      start_date,
      status = 'active',
    } = await req.json();

    if (!order_number || !client_id || !leads_purchased) {
      throw new Error('Missing required fields: order_number, client_id, leads_purchased');
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: newOrder, error } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number,
        client_id,
        name,
        description,
        leads_purchased,
        target_delivery_date,
        start_date,
        status,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ order: newOrder }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

