import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get date range based on period
function getDateRange(period: string, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday as start
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom period requires startDate and endDate');
      }
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Default to monthly
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Calculate monthly cost amount for a recurring cost within a period
function calculateRecurringCostForPeriod(
  cost: any,
  startDate: Date,
  endDate: Date
): number {
  const costStart = new Date(cost.effective_date);
  const costEnd = cost.end_date ? new Date(cost.end_date) : null;

  // Check if cost is active during the period
  if (costStart > endDate) return 0;
  if (costEnd && costEnd < startDate) return 0;

  // Calculate overlapping months
  const periodMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) + 1;

  let amount = 0;

  switch (cost.frequency) {
    case 'monthly':
      amount = cost.amount * periodMonths;
      break;
    case 'quarterly':
      // Count quarters in period
      const quarters = Math.ceil(periodMonths / 3);
      amount = cost.amount * quarters;
      break;
    case 'yearly':
      // Prorate yearly cost
      amount = (cost.amount / 12) * periodMonths;
      break;
  }

  return amount;
}

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

    // Parse query parameters
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'monthly';
    const customStart = url.searchParams.get('startDate') || undefined;
    const customEnd = url.searchParams.get('endDate') || undefined;

    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    console.log(`Generating P&L report for period: ${period} (${startDate} to ${endDate})`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch deals within date range
    const { data: deals, error: dealsError } = await supabaseAdmin
      .from('deals')
      .select('*')
      .gte('close_date', startDate)
      .lte('close_date', endDate)
      .order('close_date', { ascending: false });

    if (dealsError) {
      console.error('Deals query error:', dealsError);
      throw new Error(`Failed to fetch deals: ${dealsError.message}`);
    }

    // Fetch active recurring costs
    const { data: recurringCosts, error: recurringError } = await supabaseAdmin
      .from('business_costs')
      .select('*')
      .eq('cost_type', 'recurring')
      .eq('is_active', true);

    if (recurringError) {
      console.error('Recurring costs query error:', recurringError);
    }

    // Fetch one-time costs within date range
    const { data: oneTimeCosts, error: oneTimeError } = await supabaseAdmin
      .from('business_costs')
      .select('*')
      .eq('cost_type', 'one_time')
      .gte('effective_date', startDate)
      .lte('effective_date', endDate);

    if (oneTimeError) {
      console.error('One-time costs query error:', oneTimeError);
    }

    // Calculate deal aggregates
    const dealsList = deals || [];
    const totalRevenueIncVat = dealsList.reduce((sum, d) => sum + Number(d.revenue_inc_vat), 0);
    const totalRevenueNet = dealsList.reduce((sum, d) => sum + Number(d.revenue_net), 0);
    const totalOperatingExpenses = dealsList.reduce((sum, d) => sum + Number(d.operating_expense), 0);
    const totalSetterCosts = dealsList.reduce((sum, d) => sum + Number(d.setter_cost), 0);
    const totalSalesRepCosts = dealsList.reduce((sum, d) => sum + Number(d.sales_rep_cost), 0);
    const totalLeadFulfillmentCosts = dealsList.reduce((sum, d) => sum + Number(d.lead_fulfillment_cost), 0);
    const totalLeadsSold = dealsList.reduce((sum, d) => sum + Number(d.leads_sold), 0);

    // Calculate recurring costs for the period
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    let totalRecurringCosts = 0;
    const recurringCostsByCategory: Record<string, number> = {};

    for (const cost of recurringCosts || []) {
      const amount = calculateRecurringCostForPeriod(cost, startDateObj, endDateObj);
      totalRecurringCosts += amount;
      recurringCostsByCategory[cost.category] = (recurringCostsByCategory[cost.category] || 0) + amount;
    }

    // Calculate one-time costs
    let totalOneTimeCosts = 0;
    const oneTimeCostsByCategory: Record<string, number> = {};

    for (const cost of oneTimeCosts || []) {
      totalOneTimeCosts += Number(cost.amount);
      oneTimeCostsByCategory[cost.category] = (oneTimeCostsByCategory[cost.category] || 0) + Number(cost.amount);
    }

    // Merge category costs
    const costsByCategory: Record<string, number> = {};
    const allCategories = new Set([
      ...Object.keys(recurringCostsByCategory),
      ...Object.keys(oneTimeCostsByCategory)
    ]);
    for (const category of allCategories) {
      costsByCategory[category] = (recurringCostsByCategory[category] || 0) + (oneTimeCostsByCategory[category] || 0);
    }

    // Total costs from deals
    const totalDealCosts = totalOperatingExpenses + totalSetterCosts + totalSalesRepCosts + totalLeadFulfillmentCosts;

    // Total additional costs
    const totalAdditionalCosts = totalRecurringCosts + totalOneTimeCosts;

    // Grand total costs
    const totalCosts = totalDealCosts + totalAdditionalCosts;

    // Profit calculations
    const grossProfit = totalRevenueNet - totalCosts;
    const profitMargin = totalRevenueNet > 0 ? (grossProfit / totalRevenueNet) * 100 : 0;

    // Average calculations
    const avgRevenuePerDeal = dealsList.length > 0 ? totalRevenueNet / dealsList.length : 0;
    const avgProfitPerDeal = dealsList.length > 0 ? grossProfit / dealsList.length : 0;

    const report = {
      period: {
        type: period,
        startDate,
        endDate
      },
      // Revenue
      totalRevenueIncVat,
      totalRevenueNet,
      vatDeducted: totalRevenueIncVat - totalRevenueNet,

      // Deal Costs
      dealCosts: {
        operatingExpenses: totalOperatingExpenses,
        setterCosts: totalSetterCosts,
        salesRepCosts: totalSalesRepCosts,
        leadFulfillmentCosts: totalLeadFulfillmentCosts,
        total: totalDealCosts
      },

      // Additional Costs
      additionalCosts: {
        recurring: totalRecurringCosts,
        oneTime: totalOneTimeCosts,
        total: totalAdditionalCosts,
        byCategory: costsByCategory
      },

      // Totals
      totalCosts,
      grossProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,

      // Volume
      totalDeals: dealsList.length,
      totalLeadsSold,
      avgRevenuePerDeal: Math.round(avgRevenuePerDeal * 100) / 100,
      avgProfitPerDeal: Math.round(avgProfitPerDeal * 100) / 100,

      // Raw data for tables
      deals: dealsList,
      recurringCosts: recurringCosts || [],
      oneTimeCosts: oneTimeCosts || []
    };

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating P&L report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
