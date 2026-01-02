import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AIRTABLE_API_TOKEN = Deno.env.get("AIRTABLE_API_TOKEN");
const AIRTABLE_BASE_ID = Deno.env.get("AIRTABLE_BASE_ID");
const REPS_TABLE_NAME = "Reps"; // Will be created in Airtable

interface SyncRequest {
  action: "create" | "update" | "delete" | "list";
  repId?: string;
  name?: string;
  email?: string;
}

async function createAirtableRep(name: string, email?: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REPS_TABLE_NAME)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            "Name": name,
            "Email": email || "",
            "Status": "Active",
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Airtable create error:", error);
      // If table doesn't exist, return null (we'll create it manually)
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Error creating Airtable rep:", error);
    return null;
  }
}

async function updateAirtableRep(airtableId: string, name: string, email?: string, isActive?: boolean): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REPS_TABLE_NAME)}/${airtableId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            "Name": name,
            "Email": email || "",
            "Status": isActive ? "Active" : "Inactive",
          },
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error updating Airtable rep:", error);
    return false;
  }
}

async function getAirtableReps(): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REPS_TABLE_NAME)}?filterByFormula={Status}="Active"`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Airtable fetch error:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error("Error fetching Airtable reps:", error);
    return [];
  }
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

    const body: SyncRequest = await req.json();
    const { action, repId, name, email } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (action) {
      case "create": {
        if (!name) throw new Error("Name is required");

        // Create in Airtable first
        const airtableId = await createAirtableRep(name, email);

        // Create in Supabase with Airtable ID
        const { data: newRep, error: createError } = await supabaseAdmin
          .from("sales_reps")
          .insert({
            name,
            email: email || null,
            airtable_id: airtableId,
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create rep: ${createError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            rep: newRep,
            airtableSynced: !!airtableId,
            message: airtableId
              ? "Rep created and synced to Airtable"
              : "Rep created (Airtable sync pending - please create Reps table in Airtable)"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        if (!repId || !name) throw new Error("Rep ID and name are required");

        // Get current rep to check for Airtable ID
        const { data: currentRep } = await supabaseAdmin
          .from("sales_reps")
          .select("airtable_id, is_active")
          .eq("id", repId)
          .single();

        // Update in Airtable if synced
        if (currentRep?.airtable_id) {
          await updateAirtableRep(currentRep.airtable_id, name, email, currentRep.is_active);
        }

        // Update in Supabase
        const { error: updateError } = await supabaseAdmin
          .from("sales_reps")
          .update({ name, email: email || null, updated_at: new Date().toISOString() })
          .eq("id", repId);

        if (updateError) {
          throw new Error(`Failed to update rep: ${updateError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        // Get Airtable reps for dropdown in lead forms
        const airtableReps = await getAirtableReps();

        return new Response(
          JSON.stringify({
            success: true,
            reps: airtableReps.map(r => ({
              id: r.id,
              name: r.fields.Name,
              email: r.fields.Email,
            }))
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error("Invalid action");
    }

  } catch (error) {
    console.error("Error syncing rep:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
