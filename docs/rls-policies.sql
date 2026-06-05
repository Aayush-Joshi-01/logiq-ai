-- ============================================================
-- Learnly-AI — Row Level Security Policies
-- Run after schema.sql
-- ============================================================

-- Enable RLS on all user-owned tables
alter table public.profiles         enable row level security;
alter table public.streaks           enable row level security;
alter table public.user_roadmaps     enable row level security;
alter table public.node_completions  enable row level security;
alter table public.srs_entries       enable row level security;
alter table public.node_questions    enable row level security;
alter table public.node_answers      enable row level security;
alter table public.teams             enable row level security;
alter table public.team_members      enable row level security;

-- Note: roadmaps and ai_cache do NOT have RLS — managed by service role key only

-- ── profiles ────────────────────────────────────────────────
create policy "Users can view and edit their own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- ── streaks ─────────────────────────────────────────────────
create policy "Users can view and edit their own streak"
  on public.streaks for all
  using (auth.uid() = user_id);

-- ── user_roadmaps ────────────────────────────────────────────
create policy "Users can view and edit their own enrollments"
  on public.user_roadmaps for all
  using (auth.uid() = user_id);

-- ── node_completions ─────────────────────────────────────────
create policy "Users can view and insert their own completions"
  on public.node_completions for all
  using (auth.uid() = user_id);

-- ── srs_entries ──────────────────────────────────────────────
create policy "Users can manage their own SRS entries"
  on public.srs_entries for all
  using (auth.uid() = user_id);

-- ── node_questions ────────────────────────────────────────────
-- Anyone can read questions (community is public)
create policy "Anyone can read questions"
  on public.node_questions for select
  using (true);

-- Only authenticated users can post questions
create policy "Authenticated users can post questions"
  on public.node_questions for insert
  with check (auth.uid() = user_id);

-- Users can edit/delete their own questions
create policy "Users can manage their own questions"
  on public.node_questions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own questions"
  on public.node_questions for delete
  using (auth.uid() = user_id);

-- ── node_answers ──────────────────────────────────────────────
create policy "Anyone can read answers"
  on public.node_answers for select
  using (true);

create policy "Authenticated users can post answers"
  on public.node_answers for insert
  with check (auth.uid() = user_id);

create policy "Users can manage their own answers"
  on public.node_answers for update
  using (auth.uid() = user_id);

create policy "Users can delete their own answers"
  on public.node_answers for delete
  using (auth.uid() = user_id);

-- ── teams ─────────────────────────────────────────────────────
create policy "Team members can view their teams"
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members
      where team_id = teams.id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create teams"
  on public.teams for insert
  with check (auth.uid() = owner_id);

create policy "Team owners can update their teams"
  on public.teams for update
  using (auth.uid() = owner_id);

create policy "Team owners can delete their teams"
  on public.teams for delete
  using (auth.uid() = owner_id);

-- ── team_members ──────────────────────────────────────────────
create policy "Team members can view membership"
  on public.team_members for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
    )
  );

create policy "Team owners/admins can manage members"
  on public.team_members for all
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    )
  );
