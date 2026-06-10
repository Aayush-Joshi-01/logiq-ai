-- Migration 003: support user-generated roadmaps
-- Run in Supabase SQL Editor after 002_courses_tokens.sql

ALTER TABLE public.roadmaps
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop first so re-running is safe
DROP POLICY IF EXISTS "Users can view their own generated roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can create generated roadmaps" ON public.roadmaps;

CREATE POLICY "Users can view their own generated roadmaps"
  ON public.roadmaps FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create generated roadmaps"
  ON public.roadmaps FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_generated = true AND created_by = auth.uid());
