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
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import { normalizeRole } from '@/lib/auth/roles';

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  updateAvatarUrl: (url: string | null) => void;
  refreshProfile: () => Promise<void>;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function isHireServiceProviderMeta(meta: Record<string, unknown>): boolean {
  if (meta.role === 'service_provider') return true;
  const flag = meta.hire_service_provider;
  return flag === true || flag === 'true';
}

function buildFallbackProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, string>;
  created_at?: string;
}): Profile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = isHireServiceProviderMeta(meta)
    ? 'service_provider'
    : normalizeRole(meta.role as string | undefined);
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
  const pathname = usePathname();

  const refreshProfile = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Keep the current profile on transient misses — SIGNED_OUT clears explicitly.
      setLoading(false);
      return;
    }

    const { data: row } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (row) {
      setProfile(row as Profile);
      setLoading(false);
      return;
    }

    const { data: sp } = await supabase
      .from('service_providers')
      .select('full_name, phone, categories, is_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (sp) {
      let roleDisplay: string | null = null;
      const categoryIds = sp.categories ?? [];
      if (categoryIds.length > 0) {
        const { data: cat } = await supabase
          .from('service_categories')
          .select('name')
          .eq('id', categoryIds[0])
          .maybeSingle();
        if (cat?.name) roleDisplay = cat.name;
      }

      setProfile({
        ...buildFallbackProfile(user),
        full_name: sp.full_name,
        mobile: sp.phone,
        role: 'service_provider',
        role_display: roleDisplay,
        is_verified: sp.is_verified ?? false,
      });
    } else {
      setProfile(buildFallbackProfile(user));
    }
    setLoading(false);
  }, []);

  const updateAvatarUrl = useCallback((url: string | null) => {
    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [pathname, refreshProfile]);

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
    });
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, updateAvatarUrl, refreshProfile, clearProfile }}>
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
