-- Migration: Add category, word_type to words table, set up global words policy & create user_progress table

-- 1. Add category and word_type to words table
ALTER TABLE words ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE words ADD COLUMN IF NOT EXISTS word_type text;

-- 2. Ensure RLS policies on words table allow reading and inserting global library words (user_id IS NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'words' AND policyname = 'Allow public read of global library words'
    ) THEN
        CREATE POLICY "Allow public read of global library words" ON words
            FOR SELECT USING (user_id IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'words' AND policyname = 'Allow public insert of global library words'
    ) THEN
        CREATE POLICY "Allow public insert of global library words" ON words
            FOR INSERT WITH CHECK (user_id IS NULL);
    END IF;
END $$;

-- 3. Create user_progress table for tracking flashcards / learning status
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id uuid REFERENCES words(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('known', 'learning', 'unlearned')),
  module text NOT NULL DEFAULT 'flashcards',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, word_id, module)
);

-- RLS policies for user_progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_progress' AND policyname = 'Users can view their own progress'
    ) THEN
        CREATE POLICY "Users can view their own progress" ON user_progress
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_progress' AND policyname = 'Users can insert/update their own progress'
    ) THEN
        CREATE POLICY "Users can insert/update their own progress" ON user_progress
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
