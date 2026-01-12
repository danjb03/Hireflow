-- Add rep_name column to daily_reports if it doesn't exist
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS rep_name TEXT;
