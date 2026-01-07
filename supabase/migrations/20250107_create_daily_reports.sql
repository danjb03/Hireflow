-- Create daily_reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id TEXT NOT NULL,
  rep_name TEXT,
  report_date DATE NOT NULL,
  time_on_dialer_minutes INTEGER NOT NULL DEFAULT 0,
  calls_made INTEGER NOT NULL DEFAULT 0,
  bookings_made INTEGER NOT NULL DEFAULT 0,
  pipeline_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  screenshot_url TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  ai_extracted_time_minutes INTEGER,
  ai_extracted_calls INTEGER,
  ai_confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rep_id, report_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_reports_rep_date ON daily_reports(rep_id, report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);

-- Enable RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage all reports" ON daily_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Anyone can insert (for public rep form)
CREATE POLICY "Anyone can insert reports" ON daily_reports
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
