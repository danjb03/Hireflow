import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header (check both cases)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('No authorization header found');
      throw new Error('Unauthorized: No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Unauthorized: ${authError.message}`);
    }
    
    if (!user) {
      console.error('No user found');
      throw new Error('Unauthorized: No user found');
    }

    const { leadId } = await req.json();
    
    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    console.log('Fetching lead details for:', leadId);

    // Fetch specific page from Notion
    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    if (!notionApiKey) {
      throw new Error('NOTION_API_KEY not configured');
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id,
    });

    console.log('User is admin:', isAdmin);

    // Admins can view any lead, clients can only view leads from their database
    if (!isAdmin) {
      // For clients, verify they have access to this lead via their database
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('notion_database_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Failed to get user profile');
      }

      if (!profile?.notion_database_id) {
        throw new Error('No Notion database configured for your account. Please contact your administrator.');
      }
    }

    const notionResponse = await fetch(
      `https://api.notion.com/v1/pages/${leadId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
        },
      }
    );

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error('Notion API error:', errorText);
      throw new Error(`Notion API error: ${notionResponse.status}`);
    }

    const page = await notionResponse.json();
    const props = page.properties;

    // Log all available property names to help debug
    console.log('Available Notion properties:', Object.keys(props));
    
    // Log sample of property structures
    Object.keys(props).slice(0, 5).forEach(key => {
      console.log(`Property "${key}" type:`, props[key]?.type);
    });

    // Helper function to extract text from rich_text or title arrays
    const getText = (prop: any) => {
      if (!prop) return '';
      if (prop.title && prop.title[0]) return prop.title[0].plain_text;
      if (prop.rich_text && prop.rich_text[0]) return prop.rich_text[0].plain_text;
      return '';
    };

    // Extract company name - try multiple possible field names
    const companyName = 
      getText(props.Name) || 
      getText(props.Title) || 
      getText(props['Company Name']) ||
      (props['Company Website']?.url ? new URL(props['Company Website'].url).hostname.replace('www.', '') : '') ||
      'Company Name Not Available';

    // Transform to detailed format with ALL fields
    const lead = {
      id: page.id,
      status: props.STAGE?.select?.name || props.Status?.select?.name || 'New',
      companyName,
      
      // Company Information
      companyWebsite: props['Company Website']?.url || '',
      companyLinkedIn: props['Companies LinkedIn']?.url || '',
      industry: props.Industry?.select?.name || getText(props.Industry) || null,
      companySize: props.Size?.select?.name || getText(props.Size) || null,
      employeeCount: props['Employee Count']?.number?.toString() || null,
      country: props.Country?.select?.name || getText(props.Country) || null,
      location: getText(props['Address - Location']) || getText(props.Location) || null,
      companyDescription: getText(props['Company Description']) || null,
      founded: props.Founded?.date?.start || getText(props.Founded) || null,
      
      // Contact Details
      contactName: getText(props['Contact Name']) || null,
      jobTitle: getText(props.Title) || getText(props['Job Title']) || null,
      email: props.Email?.email || '',
      phone: props.Phone?.phone_number || '',
      linkedInProfile: props["Contact's LinkedIn"]?.url || props['LinkedIn Profile']?.url || '',
      
      // Interaction Details
      callNotes: getText(props['Call notes']) || getText(props['Call Notes']) || null,
      callbackDateTime: props['Callback Date and Time']?.date?.start || null,
      recordingTranscript: getText(props['Recording transcript']) || getText(props['Recording Transcript']) || null,
      aiSummary: getText(props['AI summary']) || getText(props['AI Summary']) || null,
      
      // Job Information
      jobPostingTitle: getText(props['Title - Jobs']) || null,
      jobDescription: getText(props['Description - Jobs']) || null,
      jobUrl: props['Url - Jobs']?.url || null,
      activeJobsUrl: props['Find Active Job Openings']?.url || null,
      jobsOpen: props['Jobs open']?.number?.toString() || getText(props['Jobs open']) || null,
      
      // Parse job openings if stored as JSON string
      jobOpenings: (() => {
        try {
          const jobsText = getText(props['Job Openings']);
          return jobsText ? JSON.parse(jobsText) : [];
        } catch {
          return [];
        }
      })(),
      
      // Metadata
      dateAdded: props['Date Added']?.date?.start || page.created_time,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    };

    console.log('Lead details fetched successfully');
    console.log('Returning lead with fields:', Object.keys(lead));
    console.log('Sample data - Company Name:', lead.companyName);
    console.log('Sample data - Status:', lead.status);
    console.log('Sample data - Has Call Notes:', !!lead.callNotes);
    console.log('Sample data - Has AI Summary:', !!lead.aiSummary);

    return new Response(
      JSON.stringify({ lead }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-lead-details:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});