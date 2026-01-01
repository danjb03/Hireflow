-- P&L System Tables Migration
-- Creates deals, business_costs, and cost_categories tables

-- ============================================
-- Table 1: deals - Stores deal/sale records
-- ============================================
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  revenue_inc_vat NUMERIC(12, 2) NOT NULL,
  revenue_net NUMERIC(12, 2) NOT NULL,
  operating_expense NUMERIC(12, 2) NOT NULL,
  leads_sold INTEGER NOT NULL DEFAULT 0,
  lead_sale_price NUMERIC(10, 2) NOT NULL,
  setter_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  sales_rep_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  setter_cost NUMERIC(12, 2) NOT NULL,
  sales_rep_cost NUMERIC(12, 2) NOT NULL,
  lead_fulfillment_cost NUMERIC(12, 2) NOT NULL,
  close_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for deals table
COMMENT ON TABLE public.deals IS 'Stores deal/sale records for P&L tracking';
COMMENT ON COLUMN public.deals.revenue_inc_vat IS 'Total revenue including 20% VAT';
COMMENT ON COLUMN public.deals.revenue_net IS 'Net revenue after VAT removed (revenue_inc_vat / 1.20)';
COMMENT ON COLUMN public.deals.operating_expense IS '20% of net revenue for operating expenses';
COMMENT ON COLUMN public.deals.lead_fulfillment_cost IS 'Lead cost at GBP 20 per lead sold';
COMMENT ON COLUMN public.deals.setter_cost IS 'Setter commission calculated from net revenue';
COMMENT ON COLUMN public.deals.sales_rep_cost IS 'Sales rep commission calculated from net revenue';

-- ============================================
-- Table 2: cost_categories - Lookup table for cost categories
-- ============================================
CREATE TABLE public.cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cost_categories IS 'Lookup table for business cost categories';

-- Seed default categories
INSERT INTO public.cost_categories (name, description, icon, color, sort_order) VALUES
  ('software', 'Software subscriptions and licenses', 'Monitor', 'blue', 1),
  ('data', 'Data providers and systems', 'Database', 'purple', 2),
  ('marketing', 'Marketing and advertising', 'Megaphone', 'green', 3),
  ('personnel', 'Staff and contractor costs', 'Users', 'orange', 4),
  ('office', 'Office and facilities', 'Building2', 'slate', 5),
  ('other', 'Other miscellaneous costs', 'Package', 'gray', 6);

-- ============================================
-- Table 3: business_costs - Additional business expenses
-- ============================================
CREATE TABLE public.business_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('recurring', 'one_time')),
  frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'yearly') OR frequency IS NULL),
  category TEXT NOT NULL REFERENCES public.cost_categories(name),
  effective_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.business_costs IS 'Stores additional business expenses for P&L tracking';
COMMENT ON COLUMN public.business_costs.frequency IS 'For recurring costs: monthly, quarterly, or yearly';
COMMENT ON COLUMN public.business_costs.effective_date IS 'Date when cost starts or was incurred (for one-time)';
COMMENT ON COLUMN public.business_costs.end_date IS 'Optional end date for recurring costs';

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_deals_close_date ON public.deals(close_date DESC);
CREATE INDEX idx_deals_created_at ON public.deals(created_at DESC);
CREATE INDEX idx_deals_company_name ON public.deals(company_name);

CREATE INDEX idx_business_costs_effective_date ON public.business_costs(effective_date DESC);
CREATE INDEX idx_business_costs_category ON public.business_costs(category);
CREATE INDEX idx_business_costs_cost_type ON public.business_costs(cost_type);
CREATE INDEX idx_business_costs_is_active ON public.business_costs(is_active) WHERE is_active = true;

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for deals (admin only)
-- ============================================
CREATE POLICY "Admins can view all deals"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert deals"
  ON public.deals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update deals"
  ON public.deals
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete deals"
  ON public.deals
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- RLS Policies for business_costs (admin only)
-- ============================================
CREATE POLICY "Admins can view all business costs"
  ON public.business_costs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert business costs"
  ON public.business_costs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update business costs"
  ON public.business_costs
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete business costs"
  ON public.business_costs
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- RLS Policies for cost_categories (read for all, admin can manage)
-- ============================================
CREATE POLICY "Authenticated users can view cost categories"
  ON public.cost_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert cost categories"
  ON public.cost_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update cost categories"
  ON public.cost_categories
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete cost categories"
  ON public.cost_categories
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Auto-update timestamp trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_costs_updated_at
  BEFORE UPDATE ON public.business_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
