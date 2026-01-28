-- Create marketplace_interests table for tracking lead interest registrations
CREATE TABLE IF NOT EXISTS public.marketplace_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_name TEXT NOT NULL,
  message TEXT,
  lead_id TEXT NOT NULL,              -- Airtable record ID
  lead_summary TEXT,                   -- "Tech company in London" style
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, qualified, closed
  close_opportunity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  admin_notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_interests_status ON public.marketplace_interests(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_interests_lead_id ON public.marketplace_interests(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_interests_created_at ON public.marketplace_interests(created_at DESC);

-- Enable RLS
ALTER TABLE public.marketplace_interests ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage marketplace interests" ON public.marketplace_interests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Allow anonymous inserts for public interest registration
CREATE POLICY "Anyone can submit interest" ON public.marketplace_interests
  FOR INSERT WITH CHECK (true);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_marketplace_interests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketplace_interests_updated_at
  BEFORE UPDATE ON public.marketplace_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_interests_updated_at();
