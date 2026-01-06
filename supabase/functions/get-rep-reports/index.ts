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
    const repId = url.searchParams.get('repId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Get all reps for target info
    const repsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reps')}`;
    const repsResponse = await fetch(repsUrl, {
      headers: { 'Authorization': `Bearer ${airtableToken}` }
    });
    const repsData = await repsResponse.json();

    const repsMap = new Map();
    (repsData.records || []).forEach((r: any) => {
      repsMap.set(r.id, {
        id: r.id,
        name: r.fields?.Name || 'Unknown',
        email: r.fields?.Email || null,
        daily_calls_target: r.fields?.['Daily Calls Target'] || 100,
        daily_hours_target: r.fields?.['Daily Hours Target'] || 4,
        daily_bookings_target: r.fields?.['Daily Bookings Target'] || 1,
        daily_pipeline_target: r.fields?.['Daily Pipeline Target'] || 5000,
      });
    });

    // Build filter formula for reports
    const filters = [];
    if (repId) {
      filters.push(`FIND('${repId}', ARRAYJOIN({Rep}))`);
    }
    if (startDate) {
      filters.push(`{Report Date}>='${startDate}'`);
    }
    if (endDate) {
      filters.push(`{Report Date}<='${endDate}'`);
    }

    let reportsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reports')}?sort[0][field]=Report Date&sort[0][direction]=desc`;
    if (filters.length > 0) {
      const filterFormula = filters.length === 1 ? filters[0] : `AND(${filters.join(',')})`;
      reportsUrl += `&filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const reportsResponse = await fetch(reportsUrl, {
      headers: { 'Authorization': `Bearer ${airtableToken}` }
    });

    if (!reportsResponse.ok) throw new Error('Failed to fetch reports');
    const reportsData = await reportsResponse.json();

    // Transform and enrich reports
    const enrichedReports = (reportsData.records || []).map((r: any) => {
      const repIdFromReport = r.fields?.Rep?.[0];
      const rep = repsMap.get(repIdFromReport);

      const report = {
        id: r.id,
        rep_id: repIdFromReport,
        report_date: r.fields?.['Report Date'] || null,
        time_on_dialer_minutes: r.fields?.['Time on Dialer'] || 0,
        calls_made: r.fields?.['Calls Made'] || 0,
        bookings_made: r.fields?.['Bookings Made'] || 0,
        pipeline_value: r.fields?.['Pipeline Value'] || 0,
        notes: r.fields?.Notes || null,
        screenshot_url: r.fields?.['Screenshot URL'] || null,
        status: r.fields?.Status || 'Pending',
      };

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
