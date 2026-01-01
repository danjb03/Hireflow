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

    if (!costData.id) throw new Error('Cost ID is required');

    const updateFields: Record<string, any> = {};

    if (costData.name !== undefined) updateFields.name = costData.name;
    if (costData.description !== undefined) updateFields.description = costData.description;
    if (costData.amount !== undefined) updateFields.amount = parseFloat(costData.amount);
    if (costData.costType !== undefined) updateFields.cost_type = costData.costType;
    if (costData.frequency !== undefined) updateFields.frequency = costData.frequency;
    if (costData.category !== undefined) updateFields.category = costData.category;
    if (costData.effectiveDate !== undefined) updateFields.effective_date = costData.effectiveDate;
    if (costData.endDate !== undefined) updateFields.end_date = costData.endDate;
    if (costData.isActive !== undefined) updateFields.is_active = costData.isActive;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: cost, error: updateError } = await supabaseAdmin
      .from('business_costs')
      .update(updateFields)
      .eq('id', costData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update business cost: ${updateError.message}`);
    }

    console.log('Business cost updated successfully:', cost.id);

    return new Response(
      JSON.stringify({ success: true, cost }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating business cost:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
