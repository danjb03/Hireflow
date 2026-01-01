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

    const costData = await req.json();

    // Validate required fields
    if (!costData.name) throw new Error('Cost name is required');
    if (!costData.amount || costData.amount <= 0) throw new Error('Amount is required');
    if (!costData.costType) throw new Error('Cost type is required');
    if (!['recurring', 'one_time'].includes(costData.costType)) throw new Error('Invalid cost type');
    if (!costData.category) throw new Error('Category is required');
    if (!costData.effectiveDate) throw new Error('Effective date is required');

    // Validate frequency for recurring costs
    if (costData.costType === 'recurring' && !costData.frequency) {
      throw new Error('Frequency is required for recurring costs');
    }
    if (costData.frequency && !['monthly', 'quarterly', 'yearly'].includes(costData.frequency)) {
      throw new Error('Invalid frequency');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: cost, error: insertError } = await supabaseAdmin
      .from('business_costs')
      .insert({
        name: costData.name,
        description: costData.description || null,
        amount: parseFloat(costData.amount),
        cost_type: costData.costType,
        frequency: costData.costType === 'recurring' ? costData.frequency : null,
        category: costData.category,
        effective_date: costData.effectiveDate,
        end_date: costData.endDate || null,
        is_active: costData.isActive !== false,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to create business cost: ${insertError.message}`);
    }

    console.log('Business cost created successfully:', cost.id);

    return new Response(
      JSON.stringify({ success: true, cost }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating business cost:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
