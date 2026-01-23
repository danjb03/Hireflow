-- Add missing columns to profiles table for full application functionality
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS airtable_client_id text,
ADD COLUMN IF NOT EXISTS client_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS airtable_rep_id text,
ADD COLUMN IF NOT EXISTS leads_purchased integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_fulfilled integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_per_day integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS target_delivery_date timestamp with time zone;

-- Add 'rep' to the app_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'rep' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'rep';
  END IF;
END
$$;