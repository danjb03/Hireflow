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

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Parse query parameters
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get all reps from Airtable
    const repsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reps')}?sort[0][field]=Name&sort[0][direction]=asc`;
    const repsResponse = await fetch(repsUrl, {
      headers: { 'Authorization': `Bearer ${airtableToken}` }
    });

    if (!repsResponse.ok) throw new Error('Failed to fetch reps');
    const repsData = await repsResponse.json();

    const reps = (repsData.records || []).map((r: any) => ({
      id: r.id,
      name: r.fields?.Name || 'Unknown',
      email: r.fields?.Email || null,
      daily_calls_target: r.fields?.['Daily Calls Target'] || 100,
      daily_hours_target: r.fields?.['Daily Hours Target'] || 4,
      daily_bookings_target: r.fields?.['Daily Bookings Target'] || 1,
      daily_pipeline_target: r.fields?.['Daily Pipeline Target'] || 5000,
    }));

    // Use service role client for database access
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get today's reports from Supabase
    const { data: todayReports, error: todayError } = await serviceClient
      .from('daily_reports')
      .select('*')
      .eq('report_date', dateParam);

    if (todayError) {
      console.error('Error fetching today reports:', todayError);
    }

    const reports = todayReports || [];

    // Get last 30 days of reports (we'll filter for 7/14/30 day periods)
    const thirtyDaysAgo = new Date(dateParam);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: recentReportsData, error: recentError } = await serviceClient
      .from('daily_reports')
      .select('*')
      .gte('report_date', thirtyDaysAgoStr)
      .lte('report_date', dateParam);

    if (recentError) {
      console.error('Error fetching recent reports:', recentError);
    }

    const allRecentReports = recentReportsData || [];

    // Calculate date boundaries for filtering
    const sevenDaysAgo = new Date(dateParam);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const fourteenDaysAgo = new Date(dateParam);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

    // Helper function to calculate stats for a time period
    const calculatePeriodStats = (reports: any[]) => {
      if (reports.length === 0) {
        return {
          reportsSubmitted: 0,
          avgCalls: 0,
          avgHours: 0,
          avgBookings: 0,
          totalPipeline: 0,
          totalCalls: 0,
          totalHours: 0,
          totalBookings: 0,
        };
      }
      const totalCalls = reports.reduce((sum: number, r: any) => sum + r.calls_made, 0);
      const totalMinutes = reports.reduce((sum: number, r: any) => sum + r.time_on_dialer_minutes, 0);
      const totalBookings = reports.reduce((sum: number, r: any) => sum + r.bookings_made, 0);
      const totalPipeline = reports.reduce((sum: number, r: any) => sum + Number(r.pipeline_value), 0);

      return {
        reportsSubmitted: reports.length,
        avgCalls: Math.round(totalCalls / reports.length),
        avgHours: Math.round((totalMinutes / reports.length / 60) * 10) / 10,
        avgBookings: Math.round((totalBookings / reports.length) * 10) / 10,
        totalPipeline,
        totalCalls,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        totalBookings,
      };
    };

    // Build dashboard data per rep
    const repDashboards = reps.map((rep: any) => {
      const todayReport = reports.find((r: any) => r.rep_id === rep.id);

      // Filter reports by rep for each time period
      const repAllReports = allRecentReports.filter((r: any) => r.rep_id === rep.id);
      const rep7DayReports = repAllReports.filter((r: any) => r.report_date >= sevenDaysAgoStr);
      const rep14DayReports = repAllReports.filter((r: any) => r.report_date >= fourteenDaysAgoStr);
      const rep30DayReports = repAllReports; // All reports are within 30 days

      // Calculate today's performance vs targets
      const todayPerformance = todayReport ? {
        hasReport: true,
        reportId: todayReport.id,
        reportStatus: todayReport.status || 'Pending',
        calls: {
          actual: todayReport.calls_made,
          target: rep.daily_calls_target,
          percent: Math.round((todayReport.calls_made / rep.daily_calls_target) * 100),
          status: getStatus(todayReport.calls_made, rep.daily_calls_target)
        },
        hours: {
          actual: todayReport.time_on_dialer_minutes / 60,
          target: rep.daily_hours_target,
          percent: Math.round((todayReport.time_on_dialer_minutes / 60 / rep.daily_hours_target) * 100),
          status: getStatus(todayReport.time_on_dialer_minutes / 60, rep.daily_hours_target)
        },
        bookings: {
          actual: todayReport.bookings_made,
          target: rep.daily_bookings_target,
          percent: rep.daily_bookings_target > 0
            ? Math.round((todayReport.bookings_made / rep.daily_bookings_target) * 100)
            : 0,
          status: getStatus(todayReport.bookings_made, rep.daily_bookings_target)
        },
        pipeline: {
          actual: todayReport.pipeline_value,
          target: rep.daily_pipeline_target,
          percent: rep.daily_pipeline_target > 0
            ? Math.round((todayReport.pipeline_value / rep.daily_pipeline_target) * 100)
            : 0,
          status: getStatus(todayReport.pipeline_value, rep.daily_pipeline_target)
        },
        notes: todayReport.notes,
        screenshotUrl: todayReport.screenshot_url,
        submittedAt: todayReport.created_at,
        aiExtractedCalls: todayReport.ai_extracted_calls,
        aiExtractedTimeMinutes: todayReport.ai_extracted_time_minutes,
        aiConfidenceScore: todayReport.ai_confidence_score
      } : {
        hasReport: false,
        calls: { actual: 0, target: rep.daily_calls_target, percent: 0, status: 'critical' as const },
        hours: { actual: 0, target: rep.daily_hours_target, percent: 0, status: 'critical' as const },
        bookings: { actual: 0, target: rep.daily_bookings_target, percent: 0, status: 'critical' as const },
        pipeline: { actual: 0, target: rep.daily_pipeline_target, percent: 0, status: 'critical' as const },
        notes: null,
        screenshotUrl: null,
        submittedAt: null
      };

      // Calculate stats for each time period
      const stats7Day = calculatePeriodStats(rep7DayReports);
      const stats14Day = calculatePeriodStats(rep14DayReports);
      const stats30Day = calculatePeriodStats(rep30DayReports);

      // Determine overall status
      let overallStatus: 'ahead' | 'on_track' | 'behind' | 'critical' | 'no_report' = 'no_report';
      if (todayPerformance.hasReport) {
        const avgPercent = (
          todayPerformance.calls.percent +
          todayPerformance.hours.percent +
          todayPerformance.bookings.percent +
          todayPerformance.pipeline.percent
        ) / 4;

        if (avgPercent >= 100) overallStatus = 'ahead';
        else if (avgPercent >= 80) overallStatus = 'on_track';
        else if (avgPercent >= 50) overallStatus = 'behind';
        else overallStatus = 'critical';
      }

      return {
        rep: {
          id: rep.id,
          name: rep.name,
          email: rep.email,
          targets: {
            dailyCalls: rep.daily_calls_target,
            dailyHours: rep.daily_hours_target,
            dailyBookings: rep.daily_bookings_target,
            dailyPipeline: rep.daily_pipeline_target
          }
        },
        today: todayPerformance,
        // Keep weeklyStats for backward compatibility
        weeklyStats: {
          reportsSubmitted: stats7Day.reportsSubmitted,
          avgCalls: stats7Day.avgCalls,
          avgHours: stats7Day.avgHours,
          avgBookings: stats7Day.avgBookings,
          totalPipeline: stats7Day.totalPipeline
        },
        // New multi-period stats
        stats7Day,
        stats14Day,
        stats30Day,
        overallStatus
      };
    });

    // Calculate team totals
    const teamTotals = {
      totalReps: reps.length,
      reportsSubmittedToday: reports.length,
      totalCalls: reports.reduce((sum: number, r: any) => sum + r.calls_made, 0),
      totalHours: Math.round(reports.reduce((sum: number, r: any) => sum + r.time_on_dialer_minutes, 0) / 60 * 10) / 10,
      totalBookings: reports.reduce((sum: number, r: any) => sum + r.bookings_made, 0),
      totalPipeline: reports.reduce((sum: number, r: any) => sum + Number(r.pipeline_value), 0),
      statusBreakdown: {
        ahead: repDashboards.filter((r: any) => r.overallStatus === 'ahead').length,
        onTrack: repDashboards.filter((r: any) => r.overallStatus === 'on_track').length,
        behind: repDashboards.filter((r: any) => r.overallStatus === 'behind').length,
        critical: repDashboards.filter((r: any) => r.overallStatus === 'critical').length,
        noReport: repDashboards.filter((r: any) => r.overallStatus === 'no_report').length
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        date: dateParam,
        team: teamTotals,
        reps: repDashboards
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching rep dashboard:', error);
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
