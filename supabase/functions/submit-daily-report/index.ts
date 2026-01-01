import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyReportInput {
  repId: string;
  reportDate: string;
  timeOnDialerMinutes: number;
  callsMade: number;
  bookingsMade: number;
  pipelineValue: number;
  aiExtractedTimeMinutes?: number;
  aiExtractedCalls?: number;
  aiConfidenceScore?: number;
  screenshotPath?: string;
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify rep exists and is active
    const { data: rep, error: repError } = await supabaseClient
      .from('sales_reps')
      .select('id, name, is_active')
      .eq('id', body.repId)
      .single();

    if (repError || !rep) {
      throw new Error('Rep not found');
    }

    if (!rep.is_active) {
      throw new Error('Rep is not active');
    }

    // Insert or update the daily report (upsert based on rep_id + report_date)
    const reportData = {
      rep_id: body.repId,
      report_date: body.reportDate,
      time_on_dialer_minutes: body.timeOnDialerMinutes,
      calls_made: body.callsMade,
      bookings_made: body.bookingsMade || 0,
      pipeline_value: body.pipelineValue || 0,
      ai_extracted_time_minutes: body.aiExtractedTimeMinutes || null,
      ai_extracted_calls: body.aiExtractedCalls || null,
      ai_confidence_score: body.aiConfidenceScore || null,
      screenshot_path: body.screenshotPath || null,
      screenshot_url: body.screenshotUrl || null,
      notes: body.notes || null,
    };

    const { data: report, error: insertError } = await supabaseClient
      .from('daily_reports')
      .upsert(reportData, {
        onConflict: 'rep_id,report_date',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        report,
        message: `Report submitted successfully for ${rep.name}`
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
