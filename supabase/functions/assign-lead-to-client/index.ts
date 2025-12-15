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

    const { leadId, clientId, orderId } = await req.json();
    if (!leadId || !clientId) throw new Error('Lead ID and Client ID required');

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Use service role key to bypass RLS for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get both client_name and airtable_client_id
    const { data: client, error: clientError } = await supabaseAdmin
      .from('profiles')
      .select('client_name, airtable_client_id')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }
    if (!client) throw new Error('Client not found. Please check the client ID.');

    // Determine what value to use for the Client field
    let clientValue: string | string[];
    
    if (client.airtable_client_id) {
      // If we have the Airtable client record ID, use it (for linked record fields)
      clientValue = [client.airtable_client_id];
    } else if (client.client_name && client.client_name.trim() !== '') {
      // Fall back to client name (for text fields or if ID not available)
      clientValue = client.client_name.trim();
    } else {
      throw new Error('Client name not configured. Please set a client name in Client Management.');
    }

    const tableName = encodeURIComponent('Qualified Lead Table');
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${leadId}`;
    
    console.log('Assigning lead:', { leadId, clientId, clientValue, hasAirtableId: !!client.airtable_client_id });
    
    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { 'Client': clientValue }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Airtable API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: airtableUrl,
        clientValue
      });
      throw new Error(`Failed to assign lead: ${response.status} - ${errorBody}`);
    }

    // If orderId is provided, also update the lead in Supabase to link it to the order
    if (orderId) {
      // First, get the client's Supabase client_id from profiles
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles')
        .select('client_name')
        .eq('id', clientId)
        .single();

      if (clientProfile?.client_name) {
        const { data: supabaseClient } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('client_name', clientProfile.client_name)
          .single();

        if (supabaseClient) {
          // Update lead in Supabase with client_id and order_id
          const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({
              client_id: supabaseClient.id,
              order_id: orderId
            })
            .eq('id', leadId);

          if (updateError) {
            console.error('Error updating lead in Supabase:', updateError);
            // Don't throw - Airtable update succeeded, Supabase update is secondary
          }
        }
      }
    } else {
      // Still update client_id in Supabase even if no order
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles')
        .select('client_name')
        .eq('id', clientId)
        .single();

      if (clientProfile?.client_name) {
        const { data: supabaseClient } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('client_name', clientProfile.client_name)
          .single();

        if (supabaseClient) {
          await supabaseAdmin
            .from('leads')
            .update({ client_id: supabaseClient.id })
            .eq('id', leadId);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error assigning lead to client:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
