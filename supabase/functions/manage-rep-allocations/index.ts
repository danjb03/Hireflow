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

    // Admin check
    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const repId = url.searchParams.get('repId');

    // GET - List allocations for a rep
    if (req.method === 'GET') {
      if (!repId) throw new Error('repId is required');

      const { data: allocations, error } = await supabaseAdmin
        .from('rep_client_allocations')
        .select('*')
        .eq('rep_id', repId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, allocations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Add new allocation
    if (req.method === 'POST') {
      const { repId, clientAirtableId, clientName } = await req.json();

      if (!repId || !clientAirtableId) {
        throw new Error('repId and clientAirtableId are required');
      }

      // Check if allocation already exists
      const { data: existing } = await supabaseAdmin
        .from('rep_client_allocations')
        .select('id')
        .eq('rep_id', repId)
        .eq('client_airtable_id', clientAirtableId)
        .single();

      if (existing) {
        throw new Error('This client is already allocated to this rep');
      }

      const { data: allocation, error } = await supabaseAdmin
        .from('rep_client_allocations')
        .insert({
          rep_id: repId,
          client_airtable_id: clientAirtableId,
          client_name: clientName || null,
          allocated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, allocation }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Remove allocation
    if (req.method === 'DELETE') {
      const { allocationId } = await req.json();

      if (!allocationId) {
        throw new Error('allocationId is required');
      }

      const { error } = await supabaseAdmin
        .from('rep_client_allocations')
        .delete()
        .eq('id', allocationId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Method ${req.method} not supported`);

  } catch (error) {
    console.error('Error managing rep allocations:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
