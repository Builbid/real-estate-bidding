-- ══════════════════════════════════════════════════════════════════
-- BUILBID — DATABASE-LEVEL BIDDING TIMER FIX
-- Run this in Supabase SQL Editor.
-- This trigger fires on every project INSERT and CORRECTS bidding_ends_at
-- so no client-side bug can ever create a project with a wrong timestamp.
-- ══════════════════════════════════════════════════════════════════

-- Function: enforce correct bidding_ends_at on every project insert
CREATE OR REPLACE FUNCTION public.enforce_bidding_ends_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- If client sent a timestamp less than 1 minute in the future,
  -- it was a bug (e.g. parseInt('0.117')=0). Override it to 7 minutes.
  IF NEW.bidding_ends_at IS NULL OR NEW.bidding_ends_at < (now() + INTERVAL '1 minute') THEN
    NEW.bidding_ends_at := now() + INTERVAL '7 minutes';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_enforce_bidding_ends_at ON public.projects;

CREATE TRIGGER trg_enforce_bidding_ends_at
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bidding_ends_at();

-- Also fix all currently broken active projects (bidding_ends_at in the past)
UPDATE public.projects
SET status = 'cancelled'
WHERE status = 'active_24h'
  AND bidding_ends_at <= now();
