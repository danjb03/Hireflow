-- Add client onboarding and status tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leads_purchased INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_date DATE,
ADD COLUMN IF NOT EXISTS target_delivery_date DATE,
ADD COLUMN IF NOT EXISTS leads_per_day NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS leads_fulfilled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_status TEXT DEFAULT 'happy' CHECK (client_status IN ('happy', 'unhappy', 'urgent', 'at_risk', 'on_track'));

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.leads_purchased IS 'Total number of leads purchased by the client';
COMMENT ON COLUMN public.profiles.onboarding_date IS 'Date when client was onboarded';
COMMENT ON COLUMN public.profiles.target_delivery_date IS 'Target date for completing all leads';
COMMENT ON COLUMN public.profiles.leads_per_day IS 'Calculated leads needed per work day to meet target';
COMMENT ON COLUMN public.profiles.leads_fulfilled IS 'Number of leads completed/fulfilled so far';
COMMENT ON COLUMN public.profiles.client_status IS 'Client happiness/status: happy, unhappy, urgent, at_risk, on_track';

-- Create index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_profiles_client_status ON public.profiles(client_status) WHERE client_name IS NOT NULL;

-- Create index for faster queries on target delivery date
CREATE INDEX IF NOT EXISTS idx_profiles_target_delivery_date ON public.profiles(target_delivery_date) WHERE target_delivery_date IS NOT NULL;

