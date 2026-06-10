-- Migration 002: Courses, lazy content, token tracking, profile personalization
-- Run in Supabase SQL editor after 001 (initial schema)

-- ─── Extend profiles for personalization ─────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS work_field        text,
  ADD COLUMN IF NOT EXISTS years_experience  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS learning_summary  text,
  ADD COLUMN IF NOT EXISTS skills            text[]  DEFAULT '{}';

-- ─── Courses: user-created free-form learning topics ─────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  language    text        NOT NULL DEFAULT 'en',
  status      text        NOT NULL DEFAULT 'active',  -- active | archived
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courses_user_id_idx ON courses(user_id);
CREATE INDEX IF NOT EXISTS courses_status_idx  ON courses(user_id, status);

-- ─── Course sections: generated at outline stage ──────────────────────────────
CREATE TABLE IF NOT EXISTS course_sections (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         uuid        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  summary           text,
  position          integer     NOT NULL DEFAULT 0,
  content_generated boolean     NOT NULL DEFAULT false,
  quiz_generated    boolean     NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_sections_course_id_idx ON course_sections(course_id);

-- ─── Section content: lazy-generated on first open ───────────────────────────
CREATE TABLE IF NOT EXISTS section_content (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid        NOT NULL UNIQUE REFERENCES course_sections(id) ON DELETE CASCADE,
  content    jsonb       NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── Section quizzes: lazy-generated when section is completed ────────────────
CREATE TABLE IF NOT EXISTS section_quizzes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid        NOT NULL UNIQUE REFERENCES course_sections(id) ON DELETE CASCADE,
  questions  jsonb       NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── Token usage: server-authoritative, never trust client ───────────────────
CREATE TABLE IF NOT EXISTS token_usage (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              date        NOT NULL DEFAULT CURRENT_DATE,
  model             text        NOT NULL DEFAULT 'gemini-2.0-flash',
  prompt_tokens     integer     NOT NULL DEFAULT 0,
  completion_tokens integer     NOT NULL DEFAULT 0,
  total_tokens      integer     NOT NULL DEFAULT 0,
  endpoint          text,       -- 'outline' | 'content' | 'quiz-section' | 'tutor' | 'explain'
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS token_usage_user_date_idx ON token_usage(user_id, date);

-- ─── RLS policies ─────────────────────────────────────────────────────────────
ALTER TABLE courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_content  ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_quizzes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage      ENABLE ROW LEVEL SECURITY;

-- Courses: owner-only
CREATE POLICY "courses_owner" ON courses
  USING (auth.uid() = user_id);

-- Course sections: readable if user owns the course
CREATE POLICY "course_sections_owner" ON course_sections
  USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_sections.course_id AND courses.user_id = auth.uid())
  );

-- Section content: readable if user owns the course
CREATE POLICY "section_content_owner" ON section_content
  USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      WHERE cs.id = section_content.section_id AND c.user_id = auth.uid()
    )
  );

-- Section quizzes: same as section_content
CREATE POLICY "section_quizzes_owner" ON section_quizzes
  USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      WHERE cs.id = section_quizzes.section_id AND c.user_id = auth.uid()
    )
  );

-- Token usage: user can only read their own rows; inserts only from service role
CREATE POLICY "token_usage_read_own" ON token_usage
  FOR SELECT USING (auth.uid() = user_id);
