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

    const dealData = await req.json();

    if (!dealData.id) throw new Error('Deal ID is required');

    // Recalculate derived fields if revenue or percentages changed
    const updateFields: Record<string, any> = {};

    if (dealData.companyName !== undefined) updateFields.company_name = dealData.companyName;
    if (dealData.closeDate !== undefined) updateFields.close_date = dealData.closeDate;
    if (dealData.notes !== undefined) updateFields.notes = dealData.notes;

    // If financial fields changed, recalculate everything
    if (dealData.revenueIncVat !== undefined ||
        dealData.leadsSold !== undefined ||
        dealData.leadSalePrice !== undefined ||
        dealData.setterCommissionPercent !== undefined ||
        dealData.salesRepCommissionPercent !== undefined) {

      // Get existing deal to merge with updates
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: existingDeal } = await supabaseAdmin
        .from('deals')
        .select('*')
        .eq('id', dealData.id)
        .single();

      if (!existingDeal) throw new Error('Deal not found');

      const revenueIncVat = dealData.revenueIncVat ?? existingDeal.revenue_inc_vat;
      const leadsSold = dealData.leadsSold ?? existingDeal.leads_sold;
      const leadSalePrice = dealData.leadSalePrice ?? existingDeal.lead_sale_price;
      const setterCommissionPercent = dealData.setterCommissionPercent ?? existingDeal.setter_commission_percent;
      const salesRepCommissionPercent = dealData.salesRepCommissionPercent ?? existingDeal.sales_rep_commission_percent;

      const revenueNet = revenueIncVat / 1.20;
      const operatingExpense = revenueNet * 0.20;
      const setterCost = revenueNet * (setterCommissionPercent / 100);
      const salesRepCost = revenueNet * (salesRepCommissionPercent / 100);
      const leadFulfillmentCost = leadsSold * 20;

      updateFields.revenue_inc_vat = revenueIncVat;
      updateFields.revenue_net = revenueNet;
      updateFields.operating_expense = operatingExpense;
      updateFields.leads_sold = leadsSold;
      updateFields.lead_sale_price = leadSalePrice;
      updateFields.setter_commission_percent = setterCommissionPercent;
      updateFields.sales_rep_commission_percent = salesRepCommissionPercent;
      updateFields.setter_cost = setterCost;
      updateFields.sales_rep_cost = salesRepCost;
      updateFields.lead_fulfillment_cost = leadFulfillmentCost;
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: deal, error: updateError } = await supabaseAdmin
      .from('deals')
      .update(updateFields)
      .eq('id', dealData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update deal: ${updateError.message}`);
    }

    console.log('Deal updated successfully:', deal.id);

    return new Response(
      JSON.stringify({ success: true, deal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating deal:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
