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

    const formData = await req.json();
    
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');
    if (!airtableToken || !airtableBaseId) throw new Error('Airtable configuration missing');

    // Create record in Clients table
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Clients`;
    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Client Name': formData.clientName,
          'Contact Person': formData.contactPerson,
          'Email': formData.email,
          'Phone': formData.phone,
          'Company Website': formData.companyWebsite,
          'Company Name': formData.companyName,
          'Location': formData.location,
          'Markets they serve (locations)': formData.marketsServed,
          'Industries they serve': formData.industriesServed,
          'Sub-industries/specializations': formData.subIndustries,
          'Types of roles they hire for': formData.roleTypes,
          'Contingent or temporary staffing?': formData.staffingModel,
          'Last 5 roles placed': formData.lastRolesPlaced,
          'Last 5 companies worked with (for lookalike targeting)': formData.lastCompaniesWorkedWith,
          '5 current candidates (for candidate-led campaigns)': formData.currentCandidates,
          'Their USPs in their own words': formData.uniqueSellingPoints,
          'Niches they\'ve done well in': formData.nicheSuccesses,
          'Typical outreach/acquisition methods': formData.outreachMethods,
          'Status': 'Active'
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Airtable error:', errorBody);
      throw new Error(`Failed to create client in Airtable: ${response.status}`);
    }

    const airtableData = await response.json();
    const airtableClientId = airtableData.id;
    
    console.log('Created Airtable client record:', airtableClientId);

    // Update Supabase profile with Airtable ID and client name
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseAdmin
      .from('profiles')
      .update({ 
        airtable_client_id: airtableClientId,
        client_name: formData.clientName,
        onboarding_completed: true
      })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ success: true, airtableClientId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

