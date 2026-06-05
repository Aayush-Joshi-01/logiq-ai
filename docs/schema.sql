-- ============================================================
-- logiq-ai — Supabase / Postgres Schema
-- Run order: schema.sql → rls-policies.sql → seed.sql
-- ============================================================

-- ── profiles (extends auth.users) ──────────────────────────
create table public.profiles (
  id                     uuid references auth.users(id) primary key,
  display_name           text,
  language               text default 'en',
  subscription_tier      text default 'free',          -- 'free' | 'pro'
  stripe_customer_id     text,
  stripe_subscription_id text,
  inferred_level         text default 'beginner',      -- V2: adaptive difficulty
  preferred_style        text default 'auto',          -- V2: explanation style
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── streaks ────────────────────────────────────────────────
create table public.streaks (
  user_id          uuid references public.profiles(id) primary key,
  current_streak   int default 0,
  longest_streak   int default 0,
  last_active_date date,
  total_xp         int default 0,
  updated_at       timestamptz default now()
);

-- ── roadmaps (curated + AI-generated) ─────────────────────
create table public.roadmaps (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  category         text,
  difficulty       text,                                -- 'beginner' | 'intermediate' | 'advanced'
  is_generated     boolean default false,
  nodes            jsonb not null,
  -- nodes shape: [{"id":"n1","title":"...","type":"concept|project|assessment|milestone","estimated_minutes":20,"week":1}]
  edges            jsonb not null,
  -- edges shape: [{"source":"n1","target":"n2"}]
  estimated_weeks  int,
  language         text default 'en',
  created_by       uuid references public.profiles(id),
  is_public        boolean default true,
  created_at       timestamptz default now()
);

-- ── user_roadmaps (enrollments + progress) ─────────────────
create table public.user_roadmaps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  roadmap_id   uuid references public.roadmaps(id) on delete cascade,
  status       text default 'active',                  -- 'active' | 'paused' | 'completed'
  progress     jsonb default '{}',
  -- progress shape: { "nodeId": { "status": "completed|in_progress|available|locked", "completedAt": "...", "quizScore": 80, "feynmanScore": 75 } }
  started_at   timestamptz default now(),
  completed_at timestamptz,
  unique(user_id, roadmap_id)
);

-- ── node_completions (granular, for analytics + SRS seeding) ─
create table public.node_completions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references public.profiles(id) on delete cascade,
  roadmap_id           uuid references public.roadmaps(id) on delete cascade,
  node_id              text not null,
  quiz_score           int,                            -- 0–100
  feynman_score        int,                            -- 0–100, AI-graded
  time_spent_minutes   int,
  difficulty_at_time   text,                           -- V2: inferred level when completed
  completed_at         timestamptz default now(),
  unique(user_id, node_id)                             -- idempotent: safe for offline sync retries
);

-- ── ai_cache (saves cost on repeated AI calls) ─────────────
create table public.ai_cache (
  id          uuid primary key default gen_random_uuid(),
  cache_key   text unique not null,                    -- format: explain:{nodeId}:{language}:{type}
  content     text not null,
  tokens_used int,
  provider    text default 'platform',                 -- always 'platform', never reveals underlying model
  created_at  timestamptz default now(),
  expires_at  timestamptz default now() + interval '30 days'
);

-- ── V2: srs_entries (spaced repetition, one per user per node) ─
create table public.srs_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade,
  node_id          text not null,
  roadmap_id       uuid references public.roadmaps(id),
  interval_days    int default 1,
  ease_factor      float default 2.5,
  repetitions      int default 0,
  next_review_at   timestamptz default now(),
  last_reviewed_at timestamptz,
  created_at       timestamptz default now()
);

-- ── V2: community Q&A per node ─────────────────────────────
create table public.node_questions (
  id          uuid primary key default gen_random_uuid(),
  node_id     text not null,
  roadmap_id  uuid references public.roadmaps(id),
  user_id     uuid references public.profiles(id),
  body        text not null,
  upvotes     int default 0,
  ai_summary  text,                                    -- cached AI summary of top answers (1-day TTL)
  created_at  timestamptz default now()
);

create table public.node_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid references public.node_questions(id) on delete cascade,
  user_id     uuid references public.profiles(id),
  body        text not null,
  upvotes     int default 0,
  created_at  timestamptz default now()
);

-- ── V2: teams ──────────────────────────────────────────────
create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.team_members (
  team_id    uuid references public.teams(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  role       text default 'member',                    -- 'owner' | 'admin' | 'member'
  joined_at  timestamptz default now(),
  primary key (team_id, user_id)
);

-- ── Indexes ────────────────────────────────────────────────
create index idx_user_roadmaps_user        on public.user_roadmaps(user_id);
create index idx_user_roadmaps_roadmap     on public.user_roadmaps(roadmap_id);
create index idx_node_completions_user     on public.node_completions(user_id);
create index idx_node_completions_roadmap  on public.node_completions(roadmap_id);
create index idx_srs_next_review           on public.srs_entries(user_id, next_review_at);
create index idx_ai_cache_key              on public.ai_cache(cache_key);
create index idx_ai_cache_expires          on public.ai_cache(expires_at);
create index idx_node_questions_node       on public.node_questions(node_id);
create index idx_roadmaps_public           on public.roadmaps(is_public) where is_public = true;

-- ── Auto-create profile + streak on new user ────────────────
-- This prevents "profile not found" errors on first login
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;

  insert into public.streaks (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── updated_at trigger for profiles ────────────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();
