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

    const { email } = await req.json();
    if (!email) throw new Error('Email is required');

    // First, check if user is already linked to an Airtable client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('airtable_client_id, client_name')
      .eq('id', user.id)
      .single();

    // If already linked, just mark onboarding as complete and return
    if (existingProfile?.airtable_client_id) {
      console.log('User already linked to Airtable client:', existingProfile.airtable_client_id);

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error('Failed to update profile');
      }

      return new Response(
        JSON.stringify({ success: true, clientName: existingProfile.client_name, alreadyLinked: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    console.log('Searching for client with email:', email);

    // Search for client in Airtable by email
    const filterFormula = `{Email} = '${email.replace(/'/g, "\\'")}'`;
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Clients?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`;

    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Airtable search error:', errorBody);
      throw new Error('Failed to search Airtable');
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      console.log('No client found with email:', email);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No client record found. Please make sure you submitted the form with the same email address you used to sign up.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientRecord = data.records[0];
    const airtableClientId = clientRecord.id;
    const clientName = clientRecord.fields['Client Name'] || clientRecord.fields['Company Name'] || email;

    console.log('Found client record:', airtableClientId, clientName);

    // Update Supabase profile (reusing supabaseAdmin from above)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        airtable_client_id: airtableClientId,
        client_name: clientName,
        onboarding_completed: true
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error('Failed to update profile');
    }

    console.log('Successfully completed onboarding for user:', user.id);

    return new Response(
      JSON.stringify({ success: true, clientName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
