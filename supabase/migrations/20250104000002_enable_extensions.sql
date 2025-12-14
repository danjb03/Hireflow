-- Enable pg_trgm for fuzzy text search (for company name search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for full-text search on company_name
-- This will make ILIKE queries much faster
CREATE INDEX IF NOT EXISTS idx_leads_company_name_trgm ON public.leads USING gin(company_name gin_trgm_ops);

