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

    // Parse query parameters
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const costType = url.searchParams.get('costType');
    const isActive = url.searchParams.get('isActive');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabaseAdmin
      .from('business_costs')
      .select('*')
      .order('effective_date', { ascending: false });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (costType && costType !== 'all') {
      query = query.eq('cost_type', costType);
    }
    if (isActive !== null && isActive !== 'all') {
      query = query.eq('is_active', isActive === 'true');
    }
    if (startDate) {
      query = query.gte('effective_date', startDate);
    }
    if (endDate) {
      query = query.lte('effective_date', endDate);
    }

    const { data: costs, error: queryError } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      throw new Error(`Failed to fetch business costs: ${queryError.message}`);
    }

    // Also fetch categories for the filter dropdown
    const { data: categories } = await supabaseAdmin
      .from('cost_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    return new Response(
      JSON.stringify({
        success: true,
        costs: costs || [],
        categories: categories || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching business costs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
