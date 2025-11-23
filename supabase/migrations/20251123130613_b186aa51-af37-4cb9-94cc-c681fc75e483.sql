-- Add password field to profiles table for initial client setup
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS initial_password TEXT;

COMMENT ON COLUMN public.profiles.initial_password IS 'Temporary password for initial client setup - should be changed by user on first login';