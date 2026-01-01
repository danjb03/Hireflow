-- Rep Reporting System Tables Migration
-- Creates sales_reps, daily_reports tables and storage bucket

-- ============================================
-- Table 1: sales_reps - Stores sales rep info and targets
-- ============================================
CREATE TABLE public.sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Daily targets
  daily_calls_target INTEGER NOT NULL DEFAULT 100,
  daily_hours_target NUMERIC(4, 2) NOT NULL DEFAULT 6.0,
  daily_bookings_target INTEGER NOT NULL DEFAULT 2,
  daily_pipeline_target NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
  -- Weekly targets (optional overrides)
  weekly_bookings_target INTEGER,
  weekly_pipeline_target NUMERIC(12, 2),
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sales_reps IS 'Stores sales rep information and performance targets';
COMMENT ON COLUMN public.sales_reps.daily_hours_target IS 'Target hours on dialer per day';
COMMENT ON COLUMN public.sales_reps.daily_pipeline_target IS 'Target pipeline value in GBP per day';

-- ============================================
-- Table 2: daily_reports - Stores daily report submissions
-- ============================================
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES public.sales_reps(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  -- Core metrics
  time_on_dialer_minutes INTEGER NOT NULL,
  calls_made INTEGER NOT NULL,
  bookings_made INTEGER NOT NULL DEFAULT 0,
  pipeline_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- AI-extracted values (for reference/audit)
  ai_extracted_time_minutes INTEGER,
  ai_extracted_calls INTEGER,
  ai_confidence_score NUMERIC(3, 2),
  -- Screenshot
  screenshot_path TEXT,
  screenshot_url TEXT,
  -- Notes
  notes TEXT,
  -- Metadata
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Unique constraint: one report per rep per day
  CONSTRAINT unique_rep_daily_report UNIQUE (rep_id, report_date)
);

COMMENT ON TABLE public.daily_reports IS 'Stores daily report submissions from sales reps';
COMMENT ON COLUMN public.daily_reports.time_on_dialer_minutes IS 'Time spent on dialer in minutes';
COMMENT ON COLUMN public.daily_reports.ai_extracted_time_minutes IS 'AI-parsed time from screenshot (for audit)';
COMMENT ON COLUMN public.daily_reports.ai_confidence_score IS 'AI extraction confidence 0-1';

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_sales_reps_is_active ON public.sales_reps(is_active) WHERE is_active = true;
CREATE INDEX idx_sales_reps_name ON public.sales_reps(name);

CREATE INDEX idx_daily_reports_rep_id ON public.daily_reports(rep_id);
CREATE INDEX idx_daily_reports_date ON public.daily_reports(report_date DESC);
CREATE INDEX idx_daily_reports_rep_date ON public.daily_reports(rep_id, report_date DESC);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for sales_reps
-- ============================================
-- Anyone can view active sales reps (for the public form dropdown)
CREATE POLICY "Anyone can view active sales reps"
  ON public.sales_reps
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all sales reps
CREATE POLICY "Admins can insert sales reps"
  ON public.sales_reps
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update sales reps"
  ON public.sales_reps
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete sales reps"
  ON public.sales_reps
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- RLS Policies for daily_reports
-- ============================================
-- Anyone can insert daily reports (public form submission)
CREATE POLICY "Anyone can insert daily reports"
  ON public.daily_reports
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all daily reports
CREATE POLICY "Admins can view all daily reports"
  ON public.daily_reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can update daily reports
CREATE POLICY "Admins can update daily reports"
  ON public.daily_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can delete daily reports
CREATE POLICY "Admins can delete daily reports"
  ON public.daily_reports
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Auto-update timestamp trigger
-- ============================================
CREATE TRIGGER update_sales_reps_updated_at
  BEFORE UPDATE ON public.sales_reps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Storage Bucket for Screenshots
-- Note: Run this in the Supabase Dashboard SQL Editor
-- ============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('rep-screenshots', 'rep-screenshots', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies need to be created via Dashboard or separate migration
