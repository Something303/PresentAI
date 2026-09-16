-- ============================================================
-- PresentAI Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  avatar_url    TEXT,
  language      TEXT NOT NULL DEFAULT 'id' CHECK (language IN ('id', 'en')),
  preferred_examiner TEXT NOT NULL DEFAULT 'general_audience'
    CHECK (preferred_examiner IN ('teacher', 'lecturer', 'competition_judge', 'hr_interviewer', 'general_audience')),
  default_difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (default_difficulty IN ('easy', 'medium', 'hard')),
  theme         TEXT NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Automatic profile creation on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- PRESENTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS presentations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  file_url      TEXT,
  file_name     TEXT,
  language      TEXT NOT NULL DEFAULT 'auto'
    CHECK (language IN ('id', 'en', 'auto')),
  duration      INTEGER, -- minutes
  examiner      TEXT NOT NULL DEFAULT 'general_audience'
    CHECK (examiner IN ('teacher', 'lecturer', 'competition_judge', 'hr_interviewer', 'general_audience')),
  difficulty    TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own presentations" ON presentations;
CREATE POLICY "Users can view own presentations" ON presentations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own presentations" ON presentations;
CREATE POLICY "Users can insert own presentations" ON presentations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presentations" ON presentations;
CREATE POLICY "Users can update own presentations" ON presentations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own presentations" ON presentations;
CREATE POLICY "Users can delete own presentations" ON presentations FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- PRESENTATION ANALYSIS
-- ============================================================
CREATE TABLE IF NOT EXISTS presentation_analysis (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id       UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  summary               TEXT,
  topic                 TEXT,
  main_idea             TEXT,
  key_points            JSONB DEFAULT '[]',
  potential_questions   JSONB DEFAULT '[]',
  suggestions           JSONB DEFAULT '[]',
  weak_sections         JSONB DEFAULT '[]',
  missing_information   JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE presentation_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own analyses" ON presentation_analysis;
CREATE POLICY "Users can view own analyses" ON presentation_analysis FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM presentations WHERE id = presentation_id)
  );

DROP POLICY IF EXISTS "Users can insert own analyses" ON presentation_analysis;
CREATE POLICY "Users can insert own analyses" ON presentation_analysis FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM presentations WHERE id = presentation_id)
  );

-- ============================================================
-- PRACTICE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id     UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration            INTEGER NOT NULL DEFAULT 0, -- seconds
  transcript          TEXT,
  overall_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  content_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  speech_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
  intonation_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  body_language_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  structure_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  qa_score            NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON practice_sessions;
CREATE POLICY "Users can view own sessions" ON practice_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON practice_sessions;
CREATE POLICY "Users can insert own sessions" ON practice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SPEECH ANALYSIS
-- ============================================================
CREATE TABLE IF NOT EXISTS speech_analysis (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  words_per_minute  INTEGER NOT NULL DEFAULT 0,
  filler_words      INTEGER NOT NULL DEFAULT 0,
  filler_word_list  JSONB DEFAULT '[]',
  pause_count       INTEGER NOT NULL DEFAULT 0,
  clarity_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  pace_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
  intonation_score  NUMERIC(5,2) NOT NULL DEFAULT 0
);

ALTER TABLE speech_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own speech analysis" ON speech_analysis;
CREATE POLICY "Users can view own speech analysis" ON speech_analysis FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

DROP POLICY IF EXISTS "Users can insert own speech analysis" ON speech_analysis;
CREATE POLICY "Users can insert own speech analysis" ON speech_analysis FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

-- ============================================================
-- BODY ANALYSIS
-- ============================================================
CREATE TABLE IF NOT EXISTS body_analysis (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id          UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  eye_contact_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  posture_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  gesture_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  expression_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  movement_score      NUMERIC(5,2) NOT NULL DEFAULT 0
);

ALTER TABLE body_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own body analysis" ON body_analysis;
CREATE POLICY "Users can view own body analysis" ON body_analysis FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

DROP POLICY IF EXISTS "Users can insert own body analysis" ON body_analysis;
CREATE POLICY "Users can insert own body analysis" ON body_analysis FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

-- ============================================================
-- QA SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS qa_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  answer        TEXT,
  score         NUMERIC(5,2),
  feedback      TEXT,
  order_index   INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE qa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own qa sessions" ON qa_sessions;
CREATE POLICY "Users can view own qa sessions" ON qa_sessions FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

DROP POLICY IF EXISTS "Users can insert own qa sessions" ON qa_sessions;
CREATE POLICY "Users can insert own qa sessions" ON qa_sessions FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

DROP POLICY IF EXISTS "Users can update own qa sessions" ON qa_sessions;
CREATE POLICY "Users can update own qa sessions" ON qa_sessions FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

-- ============================================================
-- AI FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  strengths         JSONB DEFAULT '[]',
  improvements      JSONB DEFAULT '[]',
  recommendations   JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedback" ON ai_feedback;
CREATE POLICY "Users can view own feedback" ON ai_feedback FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

DROP POLICY IF EXISTS "Users can insert own feedback" ON ai_feedback;
CREATE POLICY "Users can insert own feedback" ON ai_feedback FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM practice_sessions WHERE id = session_id)
  );

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Run this in Supabase Storage settings or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presentation-materials',
  'presentation-materials',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 
        'application/vnd.openxmlformats-officedocument.presentationml.presentation']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'presentation-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'presentation-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'presentation-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
