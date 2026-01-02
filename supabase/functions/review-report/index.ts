import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequest {
  reportId: string;
  action: "approve" | "reject" | "edit";
  reviewNotes?: string;
  // For edits
  callsMade?: number;
  timeOnDialerMinutes?: number;
  bookingsMade?: number;
  pipelineValue?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: isAdmin } = await supabaseClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) throw new Error("Admin access required");

    const body: ReviewRequest = await req.json();
    const { reportId, action, reviewNotes, callsMade, timeOnDialerMinutes, bookingsMade, pipelineValue } = body;

    if (!reportId || !action) {
      throw new Error("Missing reportId or action");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the current report to store original values if editing
    const { data: currentReport, error: fetchError } = await supabaseAdmin
      .from("daily_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (fetchError || !currentReport) {
      throw new Error("Report not found");
    }

    let updateData: any = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    };

    switch (action) {
      case "approve":
        updateData.status = "approved";
        break;

      case "reject":
        updateData.status = "rejected";
        break;

      case "edit":
        updateData.status = "edited";
        // Store original values only if not already stored (first edit)
        if (!currentReport.original_calls_made) {
          updateData.original_calls_made = currentReport.calls_made;
          updateData.original_time_minutes = currentReport.time_on_dialer_minutes;
          updateData.original_bookings = currentReport.bookings_made;
          updateData.original_pipeline = currentReport.pipeline_value;
        }
        // Apply edits
        if (callsMade !== undefined) updateData.calls_made = callsMade;
        if (timeOnDialerMinutes !== undefined) updateData.time_on_dialer_minutes = timeOnDialerMinutes;
        if (bookingsMade !== undefined) updateData.bookings_made = bookingsMade;
        if (pipelineValue !== undefined) updateData.pipeline_value = pipelineValue;
        break;

      default:
        throw new Error("Invalid action");
    }

    const { error: updateError } = await supabaseAdmin
      .from("daily_reports")
      .update(updateData)
      .eq("id", reportId);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error reviewing report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
