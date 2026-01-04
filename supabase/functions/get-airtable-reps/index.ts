const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AIRTABLE_API_TOKEN = Deno.env.get("AIRTABLE_API_TOKEN");
const AIRTABLE_BASE_ID = Deno.env.get("AIRTABLE_BASE_ID");
const REPS_TABLE_NAME = "Reps";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // No auth required - public access for form dropdowns
    console.log("Fetching active reps from Airtable");

    if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
      throw new Error("Airtable configuration missing");
    }

    // Fetch reps from Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REPS_TABLE_NAME)}?filterByFormula={Status}="Active"&sort[0][field]=Name&sort[0][direction]=asc`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Airtable error:", errorText);
      throw new Error("Failed to fetch reps from Airtable");
    }

    const data = await response.json();

    const reps = (data.records || []).map((record: any) => ({
      id: record.id,
      name: record.fields.Name || "",
      email: record.fields.Email || "",
    }));

    console.log(`Found ${reps.length} active reps`);

    return new Response(
      JSON.stringify({ success: true, reps }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching Airtable reps:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
