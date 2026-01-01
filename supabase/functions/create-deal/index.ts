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

    // Validate required fields
    if (!dealData.companyName) throw new Error('Company name is required');
    if (!dealData.revenueIncVat || dealData.revenueIncVat <= 0) throw new Error('Revenue (inc VAT) is required');
    if (!dealData.leadsSold || dealData.leadsSold <= 0) throw new Error('Leads sold is required');
    if (!dealData.leadSalePrice || dealData.leadSalePrice <= 0) throw new Error('Lead sale price is required');
    if (!dealData.closeDate) throw new Error('Close date is required');

    // Calculate derived fields
    const revenueIncVat = parseFloat(dealData.revenueIncVat);
    const revenueNet = revenueIncVat / 1.20; // Remove 20% VAT
    const operatingExpense = revenueNet * 0.20; // 20% of net for operating expenses
    const leadsSold = parseInt(dealData.leadsSold);
    const leadSalePrice = parseFloat(dealData.leadSalePrice);
    const setterCommissionPercent = parseFloat(dealData.setterCommissionPercent) || 0;
    const salesRepCommissionPercent = parseFloat(dealData.salesRepCommissionPercent) || 0;

    // Calculate costs
    const setterCost = revenueNet * (setterCommissionPercent / 100);
    const salesRepCost = revenueNet * (salesRepCommissionPercent / 100);
    const leadFulfillmentCost = leadsSold * 20; // £20 per lead

    console.log('Creating deal with calculations:', {
      revenueIncVat,
      revenueNet,
      operatingExpense,
      setterCost,
      salesRepCost,
      leadFulfillmentCost
    });

    // Use service role for insert to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: deal, error: insertError } = await supabaseAdmin
      .from('deals')
      .insert({
        company_name: dealData.companyName,
        revenue_inc_vat: revenueIncVat,
        revenue_net: revenueNet,
        operating_expense: operatingExpense,
        leads_sold: leadsSold,
        lead_sale_price: leadSalePrice,
        setter_commission_percent: setterCommissionPercent,
        sales_rep_commission_percent: salesRepCommissionPercent,
        setter_cost: setterCost,
        sales_rep_cost: salesRepCost,
        lead_fulfillment_cost: leadFulfillmentCost,
        close_date: dealData.closeDate,
        notes: dealData.notes || null,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to create deal: ${insertError.message}`);
    }

    console.log('Deal created successfully:', deal.id);

    return new Response(
      JSON.stringify({ success: true, deal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating deal:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
