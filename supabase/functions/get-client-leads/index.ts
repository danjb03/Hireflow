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

    console.log('Authorization header present');

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

    console.log('Fetching leads for user:', user.id);

    // Get Notion API key
    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    if (!notionApiKey) {
      throw new Error('NOTION_API_KEY not configured');
    }

    // Check if user is admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    console.log('User is admin:', isAdmin);

    if (isAdmin) {
      // Admin can see all leads from all clients
      const { data: allProfiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('notion_database_id');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw new Error('Failed to get profiles');
      }

      const allLeads: any[] = [];
      
      console.log('Found profiles with databases:', allProfiles?.filter(p => p.notion_database_id).length);
      
      // Fetch leads from all databases
      for (const profile of allProfiles || []) {
        if (profile.notion_database_id) {
          try {
            // Format database ID with hyphens if needed
            const formattedDatabaseId = profile.notion_database_id.includes('-') 
              ? profile.notion_database_id 
              : profile.notion_database_id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            
            console.log('Admin querying database:', formattedDatabaseId);
            
            const notionResponse = await fetch(
              `https://api.notion.com/v1/databases/${formattedDatabaseId}/query`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${notionApiKey}`,
                  'Notion-Version': '2022-06-28',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ page_size: 100 })
              }
            );

            if (notionResponse.ok) {
              const notionData = await notionResponse.json();
              console.log('Database', formattedDatabaseId, 'returned', notionData.results.length, 'leads');
              const leads = notionData.results.map((page: any) => {
                const props = page.properties;
                
                // Helper to extract text
                const getText = (prop: any) => {
                  if (!prop) return '';
                  if (prop.title && prop.title[0]) return prop.title[0].plain_text;
                  if (prop.rich_text && prop.rich_text[0]) return prop.rich_text[0].plain_text;
                  return '';
                };
                
                // Extract company name
                const companyName = 
                  getText(props['Company Name']) ||
                  getText(props.Name) || 
                  getText(props.Title) || 
                  (props['Company Website']?.url ? new URL(props['Company Website'].url).hostname.replace('www.', '') : '') ||
                  'Company Name Not Available';
                
                // Parse job openings if stored as JSON string
                const parseJobOpenings = () => {
                  try {
                    const jobsText = getText(props['Job Openings']);
                    return jobsText ? JSON.parse(jobsText) : [];
                  } catch {
                    return [];
                  }
                };
                
                // Calculate status based on age
                const notionStatus = props.STAGE?.select?.name || props.Status?.select?.name;
                const dateAdded = props['Date Added']?.date?.start || page.created_time;
                const daysSinceAdded = Math.floor((Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60 * 24));
                
                let calculatedStatus = notionStatus;
                if (!notionStatus) {
                  calculatedStatus = daysSinceAdded >= 5 ? 'Lead' : 'NEW';
                }
                
                return {
                  id: page.id,
                  status: calculatedStatus,
                  companyName,
                  
                  // Company Information - using exact Notion property names
                  companyWebsite: props['Company Website']?.url || '',
                  companyLinkedIn: props['Companies Linkeidn']?.url || props['Companies LinkedIn']?.url || '',
                  industry: props.Industry?.select?.name || getText(props.Industry) || '',
                  companySize: props.Size?.select?.name || getText(props.Size) || '',
                  employeeCount: props['Employee Count']?.number?.toString() || '',
                  country: props.Country?.select?.name || getText(props.Country) || '',
                  location: getText(props['Address - Locations']) || getText(props['Address - Location']) || getText(props.Location) || '',
                  companyDescription: getText(props['Company Description']) || '',
                  founded: props.Founded?.date?.start || getText(props.Founded) || '',
                  
                  // Contact Details - using exact property names
                  contactName: getText(props['Contact Name']) || '',
                  jobTitle: getText(props.Title) || getText(props['Job Title']) || '',
                  email: props.Email?.email || getText(props.Email) || '',
                  phone: props.Phone?.phone_number || getText(props.Phone) || '',
                  linkedInProfile: props["Contact's Linkeidn"]?.url || props["Contact's LinkedIn"]?.url || props['LinkedIn Profile']?.url || '',
                  
                  // Interaction Details
                  callNotes: getText(props['Call Back Date and Time']) || getText(props['Call notes']) || getText(props['Call Notes']) || '',
                  callbackDateTime: props['Call Back Date and Time']?.date?.start || props['Callback Date and Time']?.date?.start || '',
                  recordingTranscript: getText(props['Recording transcript']) || getText(props['Recording Transcript']) || '',
                  aiSummary: getText(props['AI summary']) || getText(props['AI Summary']) || '',
                  
                  // Job Information - using exact property names
                  jobPostingTitle: getText(props['Title - Jobs']) || '',
                  jobDescription: getText(props['Description - Jobs']) || '',
                  jobUrl: props['Url - Jobs']?.url || '',
                  activeJobsUrl: props['Find Active Job Openings']?.url || '',
                  jobsOpen: props['Jobs open ']?.number?.toString() || props['Jobs open']?.number?.toString() || getText(props['Jobs open ']) || getText(props['Jobs open']) || '',
                  jobOpenings: parseJobOpenings(),
                  
                  dateAdded: props['Date Added']?.date?.start || page.created_time,
                };
              });
              allLeads.push(...leads);
            } else {
              const errorText = await notionResponse.text();
              console.error('Error fetching from database:', formattedDatabaseId, notionResponse.status, errorText);
            }
          } catch (err) {
            console.error('Error fetching from database:', profile.notion_database_id, err);
          }
        }
      }

      console.log('Admin fetched total leads:', allLeads.length);
      return new Response(
        JSON.stringify({ leads: allLeads }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular client flow - get user's Notion database ID from profile
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
      console.log('No Notion database ID configured for user');
      throw new Error('No Notion database configured for your account. Please contact your administrator.');
    }

    console.log('Fetching from Notion database:', profile.notion_database_id);

    // Format database ID with hyphens if needed (Notion expects UUID format)
    const formattedDatabaseId = profile.notion_database_id.includes('-') 
      ? profile.notion_database_id 
      : profile.notion_database_id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

    console.log('Formatted database ID:', formattedDatabaseId);

    const notionResponse = await fetch(
      `https://api.notion.com/v1/databases/${formattedDatabaseId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_size: 100
        })
      }
    );

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error('Notion API error:', errorText);
      throw new Error(`Notion API error: ${notionResponse.status}`);
    }

    const notionData = await notionResponse.json();
    console.log('Notion response pages:', notionData.results?.length || 0);

    // Transform Notion data to our format
    const leads = notionData.results.map((page: any) => {
      const props = page.properties;
      
      // Helper to extract text
      const getText = (prop: any) => {
        if (!prop) return '';
        if (prop.title && prop.title[0]) return prop.title[0].plain_text;
        if (prop.rich_text && prop.rich_text[0]) return prop.rich_text[0].plain_text;
        return '';
      };
      
      // Extract company name
      const companyName = 
        getText(props['Company Name']) ||
        getText(props.Name) || 
        getText(props.Title) || 
        (props['Company Website']?.url ? new URL(props['Company Website'].url).hostname.replace('www.', '') : '') ||
        'Company Name Not Available';
      
      // Parse job openings if stored as JSON string
      const parseJobOpenings = () => {
        try {
          const jobsText = getText(props['Job Openings']);
          return jobsText ? JSON.parse(jobsText) : [];
        } catch {
          return [];
        }
      };
      
      // Calculate status based on age
      const notionStatus = props.STAGE?.select?.name || props.Status?.select?.name;
      const dateAdded = props['Date Added']?.date?.start || page.created_time;
      const daysSinceAdded = Math.floor((Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60 * 24));
      
      let calculatedStatus = notionStatus;
      if (!notionStatus) {
        calculatedStatus = daysSinceAdded >= 5 ? 'Lead' : 'NEW';
      }
      
      return {
        id: page.id,
        status: calculatedStatus,
        companyName,
        
        // Company Information - using exact Notion property names
        companyWebsite: props['Company Website']?.url || '',
        companyLinkedIn: props['Companies Linkeidn']?.url || props['Companies LinkedIn']?.url || '',
        industry: props.Industry?.select?.name || getText(props.Industry) || '',
        companySize: props.Size?.select?.name || getText(props.Size) || '',
        employeeCount: props['Employee Count']?.number?.toString() || '',
        country: props.Country?.select?.name || getText(props.Country) || '',
        location: getText(props['Address - Locations']) || getText(props['Address - Location']) || getText(props.Location) || '',
        companyDescription: getText(props['Company Description']) || '',
        founded: props.Founded?.date?.start || getText(props.Founded) || '',
        
        // Contact Details - using exact property names
        contactName: getText(props['Contact Name']) || '',
        jobTitle: getText(props.Title) || getText(props['Job Title']) || '',
        email: props.Email?.email || getText(props.Email) || '',
        phone: props.Phone?.phone_number || getText(props.Phone) || '',
        linkedInProfile: props["Contact's Linkeidn"]?.url || props["Contact's LinkedIn"]?.url || props['LinkedIn Profile']?.url || '',
        
        // Interaction Details
        callNotes: getText(props['Call Back Date and Time']) || getText(props['Call notes']) || getText(props['Call Notes']) || '',
        callbackDateTime: props['Call Back Date and Time']?.date?.start || props['Callback Date and Time']?.date?.start || '',
        recordingTranscript: getText(props['Recording transcript']) || getText(props['Recording Transcript']) || '',
        aiSummary: getText(props['AI summary']) || getText(props['AI Summary']) || '',
        
        // Job Information - using exact property names
        jobPostingTitle: getText(props['Title - Jobs']) || '',
        jobDescription: getText(props['Description - Jobs']) || '',
        jobUrl: props['Url - Jobs']?.url || '',
        activeJobsUrl: props['Find Active Job Openings']?.url || '',
        jobsOpen: props['Jobs open ']?.number?.toString() || props['Jobs open']?.number?.toString() || getText(props['Jobs open ']) || getText(props['Jobs open']) || '',
        jobOpenings: parseJobOpenings(),
        
        dateAdded: props['Date Added']?.date?.start || page.created_time,
      };
    });

    console.log('Transformed leads:', leads.length);

    return new Response(
      JSON.stringify({ leads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-client-leads:', error);
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