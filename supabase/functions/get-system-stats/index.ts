import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Get total clients (excluding admins)
    const { data: adminRoles } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    const { data: allProfiles } = await supabaseClient
      .from('profiles')
      .select('id');

    const totalClients = allProfiles?.filter(p => !adminUserIds.has(p.id)).length || 0;

    // Fetch all leads from Airtable
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table`;
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Airtable API error: ${response.status}`);

    const data = await response.json();
    const records = data.records || [];

    const totalLeads = records.length;
    const statusCounts = {
      Approved: 0,
      Rejected: 0,
      'Needs Work': 0,
      Unknown: 0,
    };

    // Count by status
    records.forEach((record: any) => {
      const status = record.fields['STAGE'];
      if (status && statusCounts[status as keyof typeof statusCounts] !== undefined) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts.Unknown++;
      }
    });

    return new Response(
      JSON.stringify({
        totalClients,
        totalLeads,
        statusBreakdown: statusCounts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
