-- Add status and review fields to daily_reports
-- This allows admins to approve/reject/edit reports

-- Add status enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('pending', 'approved', 'rejected', 'edited');
  END IF;
END $$;

-- Add status column to daily_reports
ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS status report_status NOT NULL DEFAULT 'pending';

-- Add review fields
ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS original_calls_made INTEGER,
ADD COLUMN IF NOT EXISTS original_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS original_bookings INTEGER,
ADD COLUMN IF NOT EXISTS original_pipeline NUMERIC(12, 2);

-- Add airtable_id to sales_reps for syncing
ALTER TABLE public.sales_reps
ADD COLUMN IF NOT EXISTS airtable_id TEXT UNIQUE;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON public.daily_reports(status);

-- Comment on columns
COMMENT ON COLUMN public.daily_reports.status IS 'Report status: pending, approved, rejected, edited';
COMMENT ON COLUMN public.daily_reports.reviewed_by IS 'Admin who reviewed the report';
COMMENT ON COLUMN public.daily_reports.reviewed_at IS 'When the report was reviewed';
COMMENT ON COLUMN public.daily_reports.review_notes IS 'Admin notes on the review';
COMMENT ON COLUMN public.sales_reps.airtable_id IS 'Airtable record ID for syncing';
