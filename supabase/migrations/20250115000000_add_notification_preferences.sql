-- Create notification_preferences table for managing email notification settings per user
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences" ON public.notification_preferences
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Admins can insert preferences
CREATE POLICY "Admins can insert preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update all preferences
CREATE POLICY "Admins can update all preferences" ON public.notification_preferences
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Comments
COMMENT ON TABLE public.notification_preferences IS 'Stores user notification preferences for email notifications';
COMMENT ON COLUMN public.notification_preferences.lead_notifications_enabled IS 'Whether user receives per-lead email notifications (approval, assignment)';
