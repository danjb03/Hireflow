import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyReportInput {
  repId: string;
  repName?: string;
  reportDate: string;
  timeOnDialerMinutes: number;
  callsMade: number;
  bookingsMade: number;
  pipelineValue: number;
  aiExtractedTimeMinutes?: number;
  aiExtractedCalls?: number;
  aiConfidenceScore?: number;
  screenshotUrl?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: DailyReportInput = await req.json();

    // Validate required fields
    if (!body.repId) throw new Error('Rep ID is required');
    if (!body.reportDate) throw new Error('Report date is required');
    if (body.timeOnDialerMinutes === undefined || body.timeOnDialerMinutes < 0) {
      throw new Error('Time on dialer is required and must be non-negative');
    }
    if (body.callsMade === undefined || body.callsMade < 0) {
      throw new Error('Calls made is required and must be non-negative');
    }

    // Create Supabase client with service role for database access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Submitting report for rep:', body.repId, 'date:', body.reportDate);

    // Upsert the report (insert or update if exists for same rep+date)
    const { data, error } = await supabaseClient
      .from('daily_reports')
      .upsert({
        rep_id: body.repId,
        report_date: body.reportDate,
        time_on_dialer_minutes: body.timeOnDialerMinutes,
        calls_made: body.callsMade,
        bookings_made: body.bookingsMade || 0,
        pipeline_value: body.pipelineValue || 0,
        notes: body.notes || null,
        screenshot_url: body.screenshotUrl || null,
        status: 'Pending',
        ai_extracted_time_minutes: body.aiExtractedTimeMinutes || null,
        ai_extracted_calls: body.aiExtractedCalls || null,
        ai_confidence_score: body.aiConfidenceScore || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'rep_id,report_date'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }

    console.log('Report saved:', data.id);

    return new Response(
      JSON.stringify({
        success: true,
        report: data,
        message: 'Report submitted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error submitting daily report:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
