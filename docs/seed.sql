-- ============================================================
-- logiq-ai — Seed Data
-- Run after schema.sql + rls-policies.sql
-- 3 curated roadmaps with well-formed nodes + edges JSONB
-- ============================================================

-- ── Roadmap 1: Web Development Fundamentals ─────────────────
insert into public.roadmaps (title, description, category, difficulty, is_generated, nodes, edges, estimated_weeks, language, is_public)
values (
  'Web Development Fundamentals',
  'A complete path from zero to building and deploying your first web application. Covers HTML, CSS, JavaScript, and React.',
  'Programming',
  'beginner',
  false,
  '[
    {"id":"web-1","title":"HTML Basics","type":"concept","estimated_minutes":45,"week":1},
    {"id":"web-2","title":"CSS Styling","type":"concept","estimated_minutes":60,"week":1},
    {"id":"web-3","title":"JavaScript Essentials","type":"concept","estimated_minutes":90,"week":2},
    {"id":"web-4","title":"DOM Manipulation","type":"concept","estimated_minutes":60,"week":2},
    {"id":"web-5","title":"Build a Static Page","type":"project","estimated_minutes":120,"week":2},
    {"id":"web-6","title":"Async JavaScript","type":"concept","estimated_minutes":75,"week":3},
    {"id":"web-7","title":"Fetch API & REST","type":"concept","estimated_minutes":60,"week":3},
    {"id":"web-8","title":"Web Fundamentals Quiz","type":"assessment","estimated_minutes":30,"week":3},
    {"id":"web-9","title":"React Foundations","type":"concept","estimated_minutes":90,"week":4},
    {"id":"web-10","title":"Components & State","type":"concept","estimated_minutes":75,"week":4},
    {"id":"web-11","title":"Build a React App","type":"project","estimated_minutes":180,"week":5},
    {"id":"web-12","title":"Deploy to the Web","type":"milestone","estimated_minutes":60,"week":6}
  ]'::jsonb,
  '[
    {"source":"web-1","target":"web-2"},
    {"source":"web-2","target":"web-3"},
    {"source":"web-3","target":"web-4"},
    {"source":"web-4","target":"web-5"},
    {"source":"web-3","target":"web-6"},
    {"source":"web-6","target":"web-7"},
    {"source":"web-7","target":"web-8"},
    {"source":"web-5","target":"web-8"},
    {"source":"web-8","target":"web-9"},
    {"source":"web-9","target":"web-10"},
    {"source":"web-10","target":"web-11"},
    {"source":"web-11","target":"web-12"}
  ]'::jsonb,
  6,
  'en',
  true
);

-- ── Roadmap 2: Python for Data Science ──────────────────────
insert into public.roadmaps (title, description, category, difficulty, is_generated, nodes, edges, estimated_weeks, language, is_public)
values (
  'Python for Data Science',
  'Learn Python from scratch and apply it to real data analysis. Covers NumPy, Pandas, visualisation, and a capstone project.',
  'Data Science',
  'beginner',
  false,
  '[
    {"id":"ds-1","title":"Python Basics","type":"concept","estimated_minutes":60,"week":1},
    {"id":"ds-2","title":"Data Structures","type":"concept","estimated_minutes":60,"week":1},
    {"id":"ds-3","title":"Functions & Modules","type":"concept","estimated_minutes":45,"week":2},
    {"id":"ds-4","title":"NumPy Arrays","type":"concept","estimated_minutes":60,"week":2},
    {"id":"ds-5","title":"Pandas DataFrames","type":"concept","estimated_minutes":75,"week":3},
    {"id":"ds-6","title":"Data Cleaning","type":"concept","estimated_minutes":60,"week":3},
    {"id":"ds-7","title":"Data Visualisation","type":"concept","estimated_minutes":60,"week":4},
    {"id":"ds-8","title":"Exploratory Data Analysis","type":"project","estimated_minutes":120,"week":4},
    {"id":"ds-9","title":"Statistics for DS","type":"concept","estimated_minutes":75,"week":5},
    {"id":"ds-10","title":"Capstone: Analyse a Dataset","type":"milestone","estimated_minutes":180,"week":6}
  ]'::jsonb,
  '[
    {"source":"ds-1","target":"ds-2"},
    {"source":"ds-2","target":"ds-3"},
    {"source":"ds-3","target":"ds-4"},
    {"source":"ds-4","target":"ds-5"},
    {"source":"ds-5","target":"ds-6"},
    {"source":"ds-6","target":"ds-7"},
    {"source":"ds-7","target":"ds-8"},
    {"source":"ds-3","target":"ds-9"},
    {"source":"ds-8","target":"ds-10"},
    {"source":"ds-9","target":"ds-10"}
  ]'::jsonb,
  6,
  'en',
  true
);

-- ── Roadmap 3: Mobile Development with React Native ──────────
insert into public.roadmaps (title, description, category, difficulty, is_generated, nodes, edges, estimated_weeks, language, is_public)
values (
  'Mobile Development with React Native',
  'Build cross-platform iOS and Android apps with React Native and Expo. From Hello World to a published app.',
  'Mobile Dev',
  'intermediate',
  false,
  '[
    {"id":"mob-1","title":"React Native Basics","type":"concept","estimated_minutes":60,"week":1},
    {"id":"mob-2","title":"Expo Setup & Workflow","type":"concept","estimated_minutes":45,"week":1},
    {"id":"mob-3","title":"Core Components","type":"concept","estimated_minutes":60,"week":2},
    {"id":"mob-4","title":"Navigation with Expo Router","type":"concept","estimated_minutes":75,"week":2},
    {"id":"mob-5","title":"State & Data Fetching","type":"concept","estimated_minutes":75,"week":3},
    {"id":"mob-6","title":"Animations with Reanimated","type":"concept","estimated_minutes":90,"week":3},
    {"id":"mob-7","title":"Native APIs (Camera, Location)","type":"concept","estimated_minutes":60,"week":4},
    {"id":"mob-8","title":"Build a Full App","type":"project","estimated_minutes":240,"week":5},
    {"id":"mob-9","title":"Deploy with EAS Build","type":"milestone","estimated_minutes":90,"week":6}
  ]'::jsonb,
  '[
    {"source":"mob-1","target":"mob-2"},
    {"source":"mob-2","target":"mob-3"},
    {"source":"mob-3","target":"mob-4"},
    {"source":"mob-4","target":"mob-5"},
    {"source":"mob-5","target":"mob-6"},
    {"source":"mob-6","target":"mob-7"},
    {"source":"mob-5","target":"mob-7"},
    {"source":"mob-7","target":"mob-8"},
    {"source":"mob-8","target":"mob-9"}
  ]'::jsonb,
  6,
  'en',
  true
);
