-- Add onboarding_completed field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether the client has completed the onboarding form';

