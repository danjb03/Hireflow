-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Basic Information
  client_name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company_website TEXT,
  company_name TEXT,
  location TEXT,
  
  -- Business Information
  markets_served TEXT,
  industries_served TEXT,
  sub_industries TEXT,
  role_types TEXT,
  staffing_model TEXT,
  
  -- Campaign Information
  last_5_roles_placed TEXT,
  last_5_companies_worked_with TEXT,
  current_candidates TEXT,
  unique_selling_points TEXT,
  niches_done_well TEXT,
  outreach_methods TEXT,
  
  -- Status
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_clients_profile_id ON public.clients(profile_id);
CREATE INDEX idx_clients_client_name ON public.clients(client_name);
CREATE INDEX idx_clients_status ON public.clients(status);

-- RLS Policies for clients table
-- Admins can do everything
CREATE POLICY "Admins can view all clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Clients can view their own client record
CREATE POLICY "Clients can view their own client record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_name = clients.client_name
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

