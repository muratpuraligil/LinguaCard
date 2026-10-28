-- LinguaCard Supabase Veritabanı Kurulum ve Şema Dosyası
-- Bu script hem ilk kurulumda hem de mevcut tabloların güncellenmesinde güvenle çalıştırılabilir.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. WORDS TABLOSU (Kelimeler ve Kütüphane)
CREATE TABLE IF NOT EXISTS public.words (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  meaning text NOT NULL,
  example_sentence text,
  translation text,
  level text,
  set_name text,
  is_archived boolean DEFAULT false,
  category text,
  word_type text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kolonların mevcut veritabanında eksik olma ihtimaline karşı ekleme
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS word_type text;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- RLS (Row Level Security) Etkinleştirme
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Words RLS Politikaları
DO $$
BEGIN
    -- Global kütüphane kelimelerini (user_id IS NULL) herkes okuyabilsin
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'words' AND policyname = 'Allow public read of global library words'
    ) THEN
        CREATE POLICY "Allow public read of global library words" ON public.words
            FOR SELECT USING (user_id IS NULL);
    END IF;

    -- Global kütüphane kelimelerini ekleme izni
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'words' AND policyname = 'Allow public insert of global library words'
    ) THEN
        CREATE POLICY "Allow public insert of global library words" ON public.words
            FOR INSERT WITH CHECK (user_id IS NULL);
    END IF;

    -- Kullanıcılar kendi kelimelerini görebilsin
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'words' AND policyname = 'Users can view their own words'
    ) THEN
        CREATE POLICY "Users can view their own words" ON public.words
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Kullanıcılar kendi kelimelerini ekleyebilsin, güncelleyebilsin ve silebilsin
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'words' AND policyname = 'Users can modify their own words'
    ) THEN
        CREATE POLICY "Users can modify their own words" ON public.words
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;


-- 3. USER_PROGRESS TABLOSU (Kullanıcı İlerleme ve Flashcard Durumları)
CREATE TABLE IF NOT EXISTS public.user_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id uuid REFERENCES public.words(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('known', 'learning', 'unlearned')),
  module text NOT NULL DEFAULT 'flashcards',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, word_id, module)
);

-- RLS (Row Level Security) Etkinleştirme
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- User Progress RLS Politikaları
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_progress' AND policyname = 'Users can view their own progress'
    ) THEN
        CREATE POLICY "Users can view their own progress" ON public.user_progress
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_progress' AND policyname = 'Users can insert/update their own progress'
    ) THEN
        CREATE POLICY "Users can insert/update their own progress" ON public.user_progress
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;


-- 4. USER_STUDY_STATE TABLOSU (Cihazlar Arası Oturum ve Set İlerlemesi Senkronizasyonu)
CREATE TABLE IF NOT EXISTS public.user_study_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Etkinleştirme
ALTER TABLE public.user_study_state ENABLE ROW LEVEL SECURITY;

-- User Study State RLS Politikaları
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


-- 5. POSTGREST VERİ API YETKİLERİ (GRANT) - 30 EKİM DEĞİŞİKLİĞİ UYUMLULUĞU
-- Supabase, 30 Ekim tarihinden itibaren public şemasındaki tablolara otomatik API erişim yetkisi vermeyi durduruyor.
-- Bu sebeple istemcilerin (supabase-js) erişebilmesi için açık GRANT komutları zorunludur:

-- 'words' tablosu izinleri
GRANT SELECT, INSERT ON public.words TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.words TO authenticated;
GRANT ALL ON public.words TO service_role;

-- 'user_progress' tablosu izinleri
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;

-- 'user_study_state' tablosu izinleri
GRANT SELECT, INSERT, UPDATE ON public.user_study_state TO authenticated;
GRANT ALL ON public.user_study_state TO service_role;
