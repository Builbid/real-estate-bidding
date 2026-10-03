'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import { normalizeRole, resolveStoredRole } from '@/lib/auth/roles';

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  updateAvatarUrl: (url: string | null) => void;
  patchProfile: (patch: Partial<Profile>) => void;
  refreshProfile: () => Promise<void>;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function buildFallbackProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, string>;
  created_at?: string;
}): Profile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  // Only used when no profile row has ever been loaded; never overrides a known role.
  const role = normalizeRole(meta.role as string | undefined);
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: (meta.full_name as string | undefined) ?? user.email ?? 'User',
    role,
    mobile: null,
    physical_address: null,
    pincode: null,
    avatar_url: null,
    is_verified: false,
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: user.created_at ?? new Date().toISOString(),
  };
}

/** Stable content signature used to decide whether a fetched profile actually changed. */
function profileSignature(p: Profile): string {
  const sorted = Object.fromEntries(
    Object.entries(p).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  return JSON.stringify(sorted);
}

function sameProfile(a: Profile | null, b: Profile | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return profileSignature(a) === profileSignature(b);
}

export function ProfileProvider({
  initialProfile,
  children,
}: {
  initialProfile?: Profile | null;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(!initialProfile);
  const supabaseRef = useRef(createClient());
  const inFlightRef = useRef<Promise<void> | null>(null);
  const profileRef = useRef<Profile | null>(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    // Coalesce concurrent refresh calls (Strict Mode / auth events).
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }

    const run = (async () => {
      const supabase = supabaseRef.current;
      // Prefer session cookie read — avoids an extra /auth/v1/user round-trip on every refresh.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const user = session.user;
      const { data: row, error: rowError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (row) {
        const next: Profile = {
          ...(row as Profile),
          role: resolveStoredRole((row as Profile).role),
        };
        // Keep the same object when nothing changed so consumers don't re-render (flicker).
        setProfile((prev) => (sameProfile(prev, next) ? prev : next));
        setLoading(false);
        return;
      }

      // A failed / empty fetch must never replace a known profile (and its role)
      // with a metadata-derived guess.
      if (rowError) console.warn('[ProfileProvider] profile fetch failed:', rowError.message);
      setProfile((prev) => (prev && prev.id === user.id ? prev : buildFallbackProfile(user)));
      setLoading(false);
    })();

    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  }, []);

  const updateAvatarUrl = useCallback((url: string | null) => {
    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
  }, []);

  const patchProfile = useCallback((patch: Partial<Profile>) => {
    // `role` is assigned server-side only; profile edits can never change it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role: _lockedRole, ...safePatch } = patch;
    setProfile((prev) => (prev ? { ...prev, ...safePatch } : prev));
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setLoading(false);
  }, []);

  // Load once on mount — do NOT refetch on every route change (was causing duplicate user/profiles calls).
  // `initialProfile` is a new object on every server render, so depend on its
  // content signature (not identity) to avoid re-running this effect in a loop.
  const initialSignature = initialProfile ? profileSignature(initialProfile) : null;
  const [syncedSignature, setSyncedSignature] = useState(initialSignature);

  // Adopt fresh server data (e.g. after router.refresh()) only when its content changed.
  // Done during render (derived-state pattern) instead of in an effect to avoid cascading renders.
  if (initialSignature !== syncedSignature) {
    setSyncedSignature(initialSignature);
    if (initialProfile) {
      setProfile((prev) => (sameProfile(prev, initialProfile) ? prev : initialProfile));
      setLoading(false);
    }
  }

  const hasInitialProfile = Boolean(initialProfile);

  useEffect(() => {
    if (!hasInitialProfile) void refreshProfile();
  }, [hasInitialProfile, refreshProfile]);

  useEffect(() => {
    function onAppSignOut() {
      setProfile(null);
      setLoading(false);
    }
    window.addEventListener('builbid:sign-out', onAppSignOut);
    return () => window.removeEventListener('builbid:sign-out', onAppSignOut);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        // Supabase re-emits SIGNED_IN on tab refocus; skip when the profile is
        // already loaded for this session (refetching caused visible flicker).
        if (session?.user?.id && profileRef.current?.id === session.user.id) return;
        void refreshProfile();
      }
      // Ignore TOKEN_REFRESHED / INITIAL_SESSION to avoid redundant profile fetches.
    });
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        updateAvatarUrl,
        patchProfile,
        refreshProfile,
        clearProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useDashboardProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useDashboardProfile must be used within ProfileProvider');
  }
  return ctx;
}

/** Optional profile update — safe outside ProfileProvider (e.g. registration). */
export function useOptionalProfileUpdate() {
  return useContext(ProfileContext);
}
