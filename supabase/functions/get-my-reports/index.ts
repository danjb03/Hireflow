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

    // Verify user has rep role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isRep = roles?.some(r => r.role === 'rep');
    if (!isRep) throw new Error('Rep access required');

    // Get rep's airtable_rep_id from profile
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('airtable_rep_id, client_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.airtable_rep_id) {
      throw new Error('Rep profile not configured with Airtable rep ID');
    }

    const airtableRepId = profile.airtable_rep_id;
    console.log(`Fetching reports for rep: ${profile.client_name} (Airtable ID: ${airtableRepId})`);

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Get rep info for targets
    const repUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reps')}/${airtableRepId}`;
    const repResponse = await fetch(repUrl, {
      headers: { 'Authorization': `Bearer ${airtableToken}` }
    });

    let repTargets = {
      daily_calls_target: 100,
      daily_hours_target: 4,
      daily_bookings_target: 1,
      daily_pipeline_target: 5000,
    };

    if (repResponse.ok) {
      const repData = await repResponse.json();
      repTargets = {
        daily_calls_target: repData.fields?.['Daily Calls Target'] || 100,
        daily_hours_target: repData.fields?.['Daily Hours Target'] || 4,
        daily_bookings_target: repData.fields?.['Daily Bookings Target'] || 1,
        daily_pipeline_target: repData.fields?.['Daily Pipeline Target'] || 5000,
      };
    }

    // Fetch reports for this rep
    const filterFormula = `FIND('${airtableRepId}', ARRAYJOIN({Rep}))`;
    const reportsUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reports')}?filterByFormula=${encodeURIComponent(filterFormula)}&sort[0][field]=Report Date&sort[0][direction]=desc`;

    const reportsResponse = await fetch(reportsUrl, {
      headers: { 'Authorization': `Bearer ${airtableToken}` }
    });

    if (!reportsResponse.ok) {
      const errorText = await reportsResponse.text();
      console.error('Airtable error:', errorText);
      throw new Error('Failed to fetch reports');
    }

    const reportsData = await reportsResponse.json();
    console.log(`Found ${reportsData.records?.length || 0} reports`);

    // Transform reports
    const reports = (reportsData.records || []).map((r: any) => {
      const timeOnDialer = r.fields?.['Time on Dialer'] || 0;
      const hoursWorked = timeOnDialer / 60;
      const calls = r.fields?.['Calls Made'] || 0;
      const bookings = r.fields?.['Bookings Made'] || 0;
      const pipeline = r.fields?.['Pipeline Value'] || 0;

      return {
        id: r.id,
        report_date: r.fields?.['Report Date'] || null,
        time_on_dialer_minutes: timeOnDialer,
        calls_made: calls,
        bookings_made: bookings,
        pipeline_value: pipeline,
        notes: r.fields?.Notes || null,
        screenshot_url: r.fields?.['Screenshot URL'] || null,
        status: r.fields?.Status || 'Pending',
        targets: {
          calls: {
            actual: calls,
            target: repTargets.daily_calls_target,
            percentOfTarget: repTargets.daily_calls_target > 0
              ? Math.round((calls / repTargets.daily_calls_target) * 100)
              : 0,
            status: getStatus(calls, repTargets.daily_calls_target)
          },
          hours: {
            actual: hoursWorked,
            target: repTargets.daily_hours_target,
            percentOfTarget: repTargets.daily_hours_target > 0
              ? Math.round((hoursWorked / repTargets.daily_hours_target) * 100)
              : 0,
            status: getStatus(hoursWorked, repTargets.daily_hours_target)
          },
          bookings: {
            actual: bookings,
            target: repTargets.daily_bookings_target,
            percentOfTarget: repTargets.daily_bookings_target > 0
              ? Math.round((bookings / repTargets.daily_bookings_target) * 100)
              : 0,
            status: getStatus(bookings, repTargets.daily_bookings_target)
          },
          pipeline: {
            actual: pipeline,
            target: repTargets.daily_pipeline_target,
            percentOfTarget: repTargets.daily_pipeline_target > 0
              ? Math.round((pipeline / repTargets.daily_pipeline_target) * 100)
              : 0,
            status: getStatus(pipeline, repTargets.daily_pipeline_target)
          }
        }
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        reports,
        count: reports.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching my reports:', error);
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
