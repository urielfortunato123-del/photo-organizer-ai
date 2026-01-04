-- Drop existing trial_sessions table and recreate with user_id
DROP TABLE IF EXISTS public.trial_sessions;

-- Create new trial_sessions table linked to user
CREATE TABLE public.trial_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_count_today INTEGER NOT NULL DEFAULT 1,
  session_count_week INTEGER NOT NULL DEFAULT 1,
  last_session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_start_date DATE NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)::date,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.trial_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own trial sessions
CREATE POLICY "Users can read their own trial sessions"
ON public.trial_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own trial sessions
CREATE POLICY "Users can insert their own trial sessions"
ON public.trial_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own trial sessions
CREATE POLICY "Users can update their own trial sessions"
ON public.trial_sessions
FOR UPDATE
USING (auth.uid() = user_id);