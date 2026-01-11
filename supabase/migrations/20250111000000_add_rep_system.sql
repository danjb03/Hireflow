-- Add 'rep' role to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'rep';

-- Add airtable_rep_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS airtable_rep_id TEXT;

-- Create index for airtable_rep_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_airtable_rep_id
  ON public.profiles(airtable_rep_id)
  WHERE airtable_rep_id IS NOT NULL;

-- Create rep-client allocations table
CREATE TABLE IF NOT EXISTS public.rep_client_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_airtable_id TEXT NOT NULL,
  client_name TEXT,
  allocated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rep_client_allocations
CREATE INDEX IF NOT EXISTS idx_rep_allocations_rep_id ON public.rep_client_allocations(rep_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rep_allocations_unique ON public.rep_client_allocations(rep_id, client_airtable_id);

-- Enable RLS
ALTER TABLE public.rep_client_allocations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all allocations
CREATE POLICY "Admins can manage allocations" ON public.rep_client_allocations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Reps can view their own allocations
CREATE POLICY "Reps can view own allocations" ON public.rep_client_allocations
  FOR SELECT USING (rep_id = auth.uid());
