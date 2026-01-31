const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache marketplace leads for 5 minutes
let marketplaceCache: any[] | null = null;
let marketplaceCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Check cache
    const now = Date.now();
    if (marketplaceCache && (now - marketplaceCacheTime) < CACHE_TTL) {
      return new Response(
        JSON.stringify({ leads: marketplaceCache }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve Marketplace Status field name (from env or Airtable metadata)
    let marketplaceStatusField = Deno.env.get('AIRTABLE_MARKETPLACE_STATUS_FIELD') || '';
    const marketplaceStatusFieldId = Deno.env.get('AIRTABLE_MARKETPLACE_STATUS_FIELD_ID') || '';

    if (!marketplaceStatusField && marketplaceStatusFieldId) {
      try {
        const metadataUrl = `https://api.airtable.com/v0/meta/bases/${airtableBaseId}/tables`;
        const metadataResponse = await fetch(metadataUrl, {
          headers: { 'Authorization': `Bearer ${airtableToken}` }
        });
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          const tables = metadata?.tables || [];
          const leadsTable = tables.find((table: any) => table.name === 'Qualified Lead Table');
          const field = (leadsTable?.fields || []).find((f: any) => f.id === marketplaceStatusFieldId);
          if (field?.name) {
            marketplaceStatusField = field.name;
          }
        }
      } catch {
        // fallback to defaults below
      }
    }

    const statusFieldCandidates = [
      marketplaceStatusField,
      'Marketplace Status',
      'marketplace status',
      'Marketplace status',
    ].filter(Boolean);

    const statusFieldName = statusFieldCandidates[0] as string;
    const filterFormula = `LOWER(TRIM({${statusFieldName}})) = 'active'`;
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Qualified%20Lead%20Table?filterByFormula=${encodeURIComponent(filterFormula)}`;

    const allLeads: any[] = [];
    let offset: string | undefined = undefined;

    let keepFetching = true;
    while (keepFetching) {
      const url = offset ? `${airtableUrl}&offset=${offset}` : airtableUrl;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // 422 means the Marketplace Status field doesn't exist yet - return empty array
        if (response.status === 422) {
          console.log('Marketplace Status field not found in Airtable - returning empty leads');
          return new Response(
            JSON.stringify({ leads: [], message: 'Marketplace not configured yet' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform and anonymize leads
      const pageLeads = (data.records || []).map((record: any) => {
        const fields = record.fields;

        // Extract region from address (just the city/region part)
        const address = Array.isArray(fields['Address'])
          ? fields['Address'].join(', ')
          : (fields['Address'] || '');
        const region = extractRegion(address, fields['Country']);

        return {
          id: record.id,
          // Anonymized display
          displayName: 'Hiring Company',
          industry: fields['Industry'] || null,
          industry2: fields['Industry 2'] || null,
          region: region,
          country: fields['Country'] || null,
          companySize: fields['Company Size'] || fields['Employee Count'] || null,
          titlesOfRoles: fields['Titles of Roles'] || null,
          // AI-generated write-up for marketplace
          marketplaceWriteup: fields['Marketplace Write-up'] || null,
          // Meta
          dateCreated: fields['Date Created'] || record.createdTime,
        };
      });

      allLeads.push(...pageLeads);
      offset = data.offset;
      keepFetching = Boolean(offset);
    }

    // Update cache
    marketplaceCache = allLeads;
    marketplaceCacheTime = now;

    return new Response(
      JSON.stringify({ leads: allLeads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching marketplace leads:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract a region/city from full address
function extractRegion(address: string, country: string | null): string {
  if (!address) return country || 'Unknown';

  // Try to extract city from address
  // Common patterns: "123 Street, City, State, Country" or "City, Country"
  const parts = address.split(',').map(p => p.trim());

  if (parts.length >= 2) {
    // Usually city is second-to-last or third-to-last
    // Skip numeric parts (postcodes) and very short parts
    for (let i = parts.length - 2; i >= 0; i--) {
      const part = parts[i];
      if (part && part.length > 2 && !/^\d+$/.test(part) && !/^[A-Z]{1,2}\d/.test(part)) {
        return part;
      }
    }
  }

  // Fallback to country or first reasonable part
  return parts[0] || country || 'Unknown';
}
