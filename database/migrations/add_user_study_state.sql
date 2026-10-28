-- Migration: Create user_study_state table for cross-device session & set synchronization

CREATE TABLE IF NOT EXISTS public.user_study_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security)
ALTER TABLE public.user_study_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_study_state' AND policyname = 'Users can view their own study state'
    ) THEN
        CREATE POLICY "Users can view their own study state" ON public.user_study_state
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_study_state' AND policyname = 'Users can insert or update their own study state'
    ) THEN
        CREATE POLICY "Users can insert or update their own study state" ON public.user_study_state
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Explicit GRANT permissions for PostgREST Data API exposure
GRANT SELECT, INSERT, UPDATE ON public.user_study_state TO authenticated;
GRANT ALL ON public.user_study_state TO service_role;
