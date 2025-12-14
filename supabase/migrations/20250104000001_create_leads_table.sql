-- Create status enum
CREATE TYPE public.lead_status AS ENUM (
  'New',
  'Lead',
  'Approved',
  'Rejected',
  'Needs Work',
  'Not Qualified'
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company Information
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_linkedin TEXT,
  company_description TEXT,
  industry TEXT,
  company_size TEXT,
  employee_count INTEGER,
  country TEXT,
  address TEXT,
  
  -- Contact Information
  contact_name TEXT,
  contact_title TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  contact_linkedin TEXT,
  
  -- Job Information
  job_title TEXT,
  job_description TEXT,
  job_url TEXT,
  job_type TEXT,
  job_level TEXT,
  
  -- Status & Assignment
  status public.lead_status DEFAULT 'New',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Additional Fields
  ai_summary TEXT,
  availability TEXT,
  last_contact_date DATE,
  next_action TEXT,
  feedback TEXT,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Indexes for performance (CRITICAL for speed)
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_client_id ON public.leads(client_id);
CREATE INDEX idx_leads_company_name ON public.leads(company_name);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_date_created ON public.leads(date_created DESC);
CREATE INDEX idx_leads_status_client ON public.leads(status, client_id); -- Composite for common queries

-- RLS Policies for leads table
-- Admins can do everything
CREATE POLICY "Admins can view all leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert leads"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Clients can only view leads assigned to them
CREATE POLICY "Clients can view their assigned leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c
      INNER JOIN public.profiles p ON c.profile_id = p.id OR c.client_name = p.client_name
      WHERE p.id = auth.uid()
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

