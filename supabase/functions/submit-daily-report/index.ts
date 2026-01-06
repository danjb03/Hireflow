const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyReportInput {
  repId: string;
  reportDate: string;
  timeOnDialerMinutes: number;
  callsMade: number;
  bookingsMade: number;
  pipelineValue: number;
  aiExtractedTimeMinutes?: number;
  aiExtractedCalls?: number;
  aiConfidenceScore?: number;
  screenshotPath?: string;
  screenshotUrl?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: DailyReportInput = await req.json();

    // Validate required fields
    if (!body.repId) throw new Error('Rep ID is required');
    if (!body.reportDate) throw new Error('Report date is required');
    if (body.timeOnDialerMinutes === undefined || body.timeOnDialerMinutes < 0) {
      throw new Error('Time on dialer is required and must be non-negative');
    }
    if (body.callsMade === undefined || body.callsMade < 0) {
      throw new Error('Calls made is required and must be non-negative');
    }

    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    if (!airtableToken || !airtableBaseId) {
      throw new Error('Airtable configuration missing');
    }

    // Build Airtable fields
    const airtableFields: Record<string, any> = {
      'Rep': [body.repId],
      'Report Date': body.reportDate,
      'Time on Dialer': body.timeOnDialerMinutes,
      'Calls Made': body.callsMade,
      'Bookings Made': body.bookingsMade || 0,
      'Pipeline Value': body.pipelineValue || 0,
      'Status': 'Pending',
    };

    if (body.notes) airtableFields['Notes'] = body.notes;
    if (body.screenshotUrl) airtableFields['Screenshot URL'] = body.screenshotUrl;
    if (body.aiExtractedTimeMinutes) airtableFields['AI Extracted Time'] = body.aiExtractedTimeMinutes;
    if (body.aiExtractedCalls) airtableFields['AI Extracted Calls'] = body.aiExtractedCalls;
    if (body.aiConfidenceScore) airtableFields['AI Confidence'] = body.aiConfidenceScore;

    console.log('Creating report with fields:', Object.keys(airtableFields).join(', '));

    // Check if report already exists for this rep + date
    const checkUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reports')}?filterByFormula=AND({Rep}='${body.repId}',{Report Date}='${body.reportDate}')`;

    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json'
      }
    });

    const checkData = await checkResponse.json();
    const existingRecord = checkData.records?.[0];

    let result;
    if (existingRecord) {
      // Update existing record
      const updateUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reports')}/${existingRecord.id}`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: airtableFields })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Airtable update error:', updateResponse.status, errorText);
        throw new Error(`Airtable error: ${updateResponse.status}`);
      }

      result = await updateResponse.json();
      console.log('Updated existing report:', result.id);
    } else {
      // Create new record
      const createUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent('Reports')}`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: airtableFields })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Airtable create error:', createResponse.status, errorText);
        throw new Error(`Airtable error: ${createResponse.status} - ${errorText}`);
      }

      result = await createResponse.json();
      console.log('Created new report:', result.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: result,
        message: 'Report submitted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error submitting daily report:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
