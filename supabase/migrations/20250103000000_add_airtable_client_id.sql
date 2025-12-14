-- Add airtable_client_id field to profiles table to link Supabase profiles to Airtable Clients records
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS airtable_client_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.airtable_client_id IS 'Airtable record ID from the Clients table - links the Supabase profile to the Airtable client record created during onboarding';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_airtable_client_id ON public.profiles(airtable_client_id) WHERE airtable_client_id IS NOT NULL;

