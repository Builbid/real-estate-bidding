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
import { normalizeRole } from '@/lib/auth/roles';

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
      const { data: row } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (row) {
        setProfile({
          ...(row as Profile),
          role: normalizeRole((row as Profile).role),
        });
        setLoading(false);
        return;
      }

      setProfile(buildFallbackProfile(user));
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
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setLoading(false);
  }, []);

  // Load once on mount — do NOT refetch on every route change (was causing duplicate user/profiles calls).
  useEffect(() => {
    if (initialProfile) {
      setLoading(false);
      return;
    }
    void refreshProfile();
  }, [initialProfile, refreshProfile]);

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
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
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
