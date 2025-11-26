-- Replace notion_database_id with client_name in profiles table
ALTER TABLE public.profiles 
DROP COLUMN notion_database_id;

ALTER TABLE public.profiles 
ADD COLUMN client_name TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.client_name IS 'The client name that matches the "Client Name" field in Airtable for lead filtering';