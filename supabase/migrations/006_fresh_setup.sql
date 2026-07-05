-- ══════════════════════════════════════════════════════════════════
-- BUILBID — COMPLETE FRESH SQL (run this in Supabase SQL Editor)
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Ensure projects table has required columns ─────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS selection_ends_at   timestamptz,
  ADD COLUMN IF NOT EXISTS selected_builder_id uuid REFERENCES public.profiles(id);

-- ── 2. RLS — owners can update their own projects ─────────────────
DO $$ BEGIN
  CREATE POLICY "projects_update_owner" ON public.projects
    FOR UPDATE USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Transition functions (5-minute selection window) ───────────
CREATE OR REPLACE FUNCTION public.expire_active_projects()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.projects
  SET    status            = 'frozen_24h',
         selection_ends_at = now() + INTERVAL '5 minutes'
  WHERE  status            = 'active_24h'
    AND  bidding_ends_at  <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_frozen_projects()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- No selection made → cancel
  UPDATE public.projects
  SET status = 'cancelled'
  WHERE status            = 'frozen_24h'
    AND selection_ends_at <= now()
    AND selected_builder_id IS NULL;
END;
$$;

-- ── 4. Notifications table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  title      text        NOT NULL,
  message    text        NOT NULL,
  project_id uuid        REFERENCES public.projects(id) ON DELETE CASCADE,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "notifications_own_select" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "notifications_own_update" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "notifications_insert_service" ON public.notifications
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications(user_id, created_at DESC);

-- ── 5. Cancel any currently stuck/broken projects ─────────────────
UPDATE public.projects
SET status = 'cancelled'
WHERE status = 'active_24h'
  AND bidding_ends_at <= now();
