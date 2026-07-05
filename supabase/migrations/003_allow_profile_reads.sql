-- ================================================================
-- FIX: Allow authenticated users to read builder profiles
-- ================================================================
-- The "reveal mechanic" (showing builder names after bidding closes)
-- requires the project owner to read other users' profiles.
-- Previously only admins could do this, so the builders map was
-- always empty and "Anonymous Builder" was shown incorrectly.
-- ================================================================

-- Allow any logged-in user to read any profile row.
-- This is intentional: builder names/roles are not secret once
-- the auction is frozen or completed.  Contact details (mobile,
-- address) are only shown to the project owner in the UI.
DROP POLICY IF EXISTS "profiles_authenticated_read_all" ON public.profiles;
CREATE POLICY "profiles_authenticated_read_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Keep the original own-profile select policy for backward compat
-- (it is now redundant but harmless alongside the above)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
