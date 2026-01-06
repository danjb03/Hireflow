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

    // Get today's reports from Airtable
    const reportsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reports')}?filterByFormula={Report Date}='${dateParam}'`;
    const reportsResponse = await fetch(reportsUrl, {
      headers: { 'Authorization': `Bearer ${airtableToken}` }
    });

    if (!reportsResponse.ok) throw new Error('Failed to fetch reports');
    const reportsData = await reportsResponse.json();

    const todayReports = (reportsData.records || []).map((r: any) => ({
      id: r.id,
      rep_id: r.fields?.Rep?.[0] || null,
      report_date: r.fields?.['Report Date'] || null,
      time_on_dialer_minutes: r.fields?.['Time on Dialer'] || 0,
      calls_made: r.fields?.['Calls Made'] || 0,
      bookings_made: r.fields?.['Bookings Made'] || 0,
      pipeline_value: r.fields?.['Pipeline Value'] || 0,
      notes: r.fields?.Notes || null,
      screenshot_url: r.fields?.['Screenshot URL'] || null,
      status: r.fields?.Status || 'Pending',
      ai_extracted_calls: r.fields?.['AI Extracted Calls'] || null,
      ai_extracted_time_minutes: r.fields?.['AI Extracted Time'] || null,
      ai_confidence_score: r.fields?.['AI Confidence'] || null,
    }));

    // Get last 7 days of reports
    const sevenDaysAgo = new Date(dateParam);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const recentReportsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reports')}?filterByFormula=AND({Report Date}>='${sevenDaysAgoStr}',{Report Date}<='${dateParam}')`;
    const recentReportsResponse = await fetch(recentReportsUrl, {
      headers: { 'Authorization': `Bearer ${airtableToken}` }
    });

    const recentReportsData = await recentReportsResponse.json();
    const recentReports = (recentReportsData.records || []).map((r: any) => ({
      id: r.id,
      rep_id: r.fields?.Rep?.[0] || null,
      time_on_dialer_minutes: r.fields?.['Time on Dialer'] || 0,
      calls_made: r.fields?.['Calls Made'] || 0,
      bookings_made: r.fields?.['Bookings Made'] || 0,
      pipeline_value: r.fields?.['Pipeline Value'] || 0,
    }));

    // Build dashboard data per rep
    const repDashboards = reps.map((rep: any) => {
      const todayReport = todayReports.find((r: any) => r.rep_id === rep.id);
      const repReports = recentReports.filter((r: any) => r.rep_id === rep.id);

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
        submittedAt: null,
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

      // Calculate 7-day averages
      const avgCalls = repReports.length > 0
        ? Math.round(repReports.reduce((sum: number, r: any) => sum + r.calls_made, 0) / repReports.length)
        : 0;
      const avgHours = repReports.length > 0
        ? Math.round((repReports.reduce((sum: number, r: any) => sum + r.time_on_dialer_minutes, 0) / repReports.length / 60) * 10) / 10
        : 0;
      const avgBookings = repReports.length > 0
        ? Math.round((repReports.reduce((sum: number, r: any) => sum + r.bookings_made, 0) / repReports.length) * 10) / 10
        : 0;
      const totalPipeline = repReports.reduce((sum: number, r: any) => sum + Number(r.pipeline_value), 0);

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
        weeklyStats: {
          reportsSubmitted: repReports.length,
          avgCalls,
          avgHours,
          avgBookings,
          totalPipeline
        },
        overallStatus
      };
    });

    // Calculate team totals
    const teamTotals = {
      totalReps: reps.length,
      reportsSubmittedToday: todayReports.length,
      totalCalls: todayReports.reduce((sum: number, r: any) => sum + r.calls_made, 0),
      totalHours: Math.round(todayReports.reduce((sum: number, r: any) => sum + r.time_on_dialer_minutes, 0) / 60 * 10) / 10,
      totalBookings: todayReports.reduce((sum: number, r: any) => sum + r.bookings_made, 0),
      totalPipeline: todayReports.reduce((sum: number, r: any) => sum + Number(r.pipeline_value), 0),
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
