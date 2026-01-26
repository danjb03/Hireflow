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

    // 1. Validate and parse request body
    const { airtable_client_id, config } = await req.json();
    if (!airtable_client_id || !config) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: airtable_client_id or config' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create the job record in the database
    const { data: job, error: insertError } = await supabaseClient
      .from('list_building_jobs')
      .insert({
        user_id: user.id,
        airtable_client_id: airtable_client_id,
        config: config,
        status: 'pending',
        progress: { step: 0, message: 'Job created.' }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Trigger the execution function (This is a simplified trigger)
    // In a real Vercel/Supabase setup, you would use a queue or a dedicated
    // background worker to call the 'execute-list-building' function asynchronously.
    // For this example, we'll return the job ID and assume the frontend or a separate
    // service will call the execution function.

    // Example of a direct call (for demonstration, but not recommended for long tasks)
    // const executionResponse = await fetch('SUPABASE_FUNCTION_URL/execute-list-building', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ jobId: job.id })
    // });

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id: job.id, 
        message: 'List building job created successfully. Please call the execution endpoint to start processing.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating list building job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
