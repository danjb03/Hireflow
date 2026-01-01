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
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Admin check
    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    // Use service role client for queries
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse query parameters
    const url = new URL(req.url);
    const repId = url.searchParams.get('repId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build query
    let query = supabaseAdmin
      .from('daily_reports')
      .select(`
        *,
        sales_reps (
          id,
          name,
          email,
          daily_calls_target,
          daily_hours_target,
          daily_bookings_target,
          daily_pipeline_target
        )
      `)
      .order('report_date', { ascending: false });

    // Apply filters
    if (repId) {
      query = query.eq('rep_id', repId);
    }

    if (startDate) {
      query = query.gte('report_date', startDate);
    }

    if (endDate) {
      query = query.lte('report_date', endDate);
    }

    const { data: reports, error } = await query;

    if (error) throw error;

    // Calculate target comparisons for each report
    const enrichedReports = (reports || []).map((report: any) => {
      const rep = report.sales_reps;
      if (!rep) return report;

      const hoursWorked = report.time_on_dialer_minutes / 60;

      return {
        ...report,
        repName: rep.name,
        repEmail: rep.email,
        targets: {
          calls: {
            actual: report.calls_made,
            target: rep.daily_calls_target,
            percentOfTarget: rep.daily_calls_target > 0
              ? Math.round((report.calls_made / rep.daily_calls_target) * 100)
              : 0,
            status: getStatus(report.calls_made, rep.daily_calls_target)
          },
          hours: {
            actual: hoursWorked,
            target: rep.daily_hours_target,
            percentOfTarget: rep.daily_hours_target > 0
              ? Math.round((hoursWorked / rep.daily_hours_target) * 100)
              : 0,
            status: getStatus(hoursWorked, rep.daily_hours_target)
          },
          bookings: {
            actual: report.bookings_made,
            target: rep.daily_bookings_target,
            percentOfTarget: rep.daily_bookings_target > 0
              ? Math.round((report.bookings_made / rep.daily_bookings_target) * 100)
              : 0,
            status: getStatus(report.bookings_made, rep.daily_bookings_target)
          },
          pipeline: {
            actual: report.pipeline_value,
            target: rep.daily_pipeline_target,
            percentOfTarget: rep.daily_pipeline_target > 0
              ? Math.round((report.pipeline_value / rep.daily_pipeline_target) * 100)
              : 0,
            status: getStatus(report.pipeline_value, rep.daily_pipeline_target)
          }
        }
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        reports: enrichedReports,
        count: enrichedReports.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching rep reports:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getStatus(actual: number, target: number): 'ahead' | 'on_track' | 'behind' | 'critical' {
  if (target === 0) return 'on_track';
  const percentage = (actual / target) * 100;
  if (percentage >= 100) return 'ahead';
  if (percentage >= 80) return 'on_track';
  if (percentage >= 50) return 'behind';
  return 'critical';
}
