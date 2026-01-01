import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepInput {
  id?: string;
  name: string;
  email?: string;
  isActive?: boolean;
  dailyCallsTarget?: number;
  dailyHoursTarget?: number;
  dailyBookingsTarget?: number;
  dailyPipelineTarget?: number;
  weeklyBookingsTarget?: number;
  weeklyPipelineTarget?: number;
}

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

    // Use service role client for operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const method = req.method;
    const url = new URL(req.url);
    const repId = url.searchParams.get('id');

    // GET - List all reps (including inactive for admin)
    if (method === 'GET') {
      const { data: reps, error } = await supabaseAdmin
        .from('sales_reps')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, reps }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Create new rep
    if (method === 'POST') {
      const body: RepInput = await req.json();

      if (!body.name?.trim()) {
        throw new Error('Rep name is required');
      }

      const repData = {
        name: body.name.trim(),
        email: body.email?.trim() || null,
        is_active: body.isActive !== false,
        daily_calls_target: body.dailyCallsTarget ?? 100,
        daily_hours_target: body.dailyHoursTarget ?? 6.0,
        daily_bookings_target: body.dailyBookingsTarget ?? 2,
        daily_pipeline_target: body.dailyPipelineTarget ?? 5000,
        weekly_bookings_target: body.weeklyBookingsTarget || null,
        weekly_pipeline_target: body.weeklyPipelineTarget || null,
        created_by: user.id,
      };

      const { data: rep, error } = await supabaseAdmin
        .from('sales_reps')
        .insert(repData)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, rep, message: 'Rep created successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT - Update existing rep
    if (method === 'PUT') {
      const body: RepInput = await req.json();

      if (!body.id) {
        throw new Error('Rep ID is required for update');
      }

      const updateData: Record<string, any> = {};

      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.email !== undefined) updateData.email = body.email?.trim() || null;
      if (body.isActive !== undefined) updateData.is_active = body.isActive;
      if (body.dailyCallsTarget !== undefined) updateData.daily_calls_target = body.dailyCallsTarget;
      if (body.dailyHoursTarget !== undefined) updateData.daily_hours_target = body.dailyHoursTarget;
      if (body.dailyBookingsTarget !== undefined) updateData.daily_bookings_target = body.dailyBookingsTarget;
      if (body.dailyPipelineTarget !== undefined) updateData.daily_pipeline_target = body.dailyPipelineTarget;
      if (body.weeklyBookingsTarget !== undefined) updateData.weekly_bookings_target = body.weeklyBookingsTarget || null;
      if (body.weeklyPipelineTarget !== undefined) updateData.weekly_pipeline_target = body.weeklyPipelineTarget || null;

      const { data: rep, error } = await supabaseAdmin
        .from('sales_reps')
        .update(updateData)
        .eq('id', body.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, rep, message: 'Rep updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Delete rep
    if (method === 'DELETE') {
      if (!repId) {
        throw new Error('Rep ID is required for delete');
      }

      const { error } = await supabaseAdmin
        .from('sales_reps')
        .delete()
        .eq('id', repId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Rep deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Method ${method} not supported`);

  } catch (error) {
    console.error('Error managing reps:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
