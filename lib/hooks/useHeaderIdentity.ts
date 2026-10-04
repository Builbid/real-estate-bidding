'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseRole, roleFromUserMetadata } from '@/lib/auth/roles';
import { useProfile } from '@/lib/hooks/useProfile';
import type { UserRole } from '@/lib/types';

export interface HeaderIdentity {
  /** Display name of the signed-in user. */
  name: string;
  role: UserRole | null;
}

function nameFromUser(
  user: { email?: string | null; user_metadata?: Record<string, unknown> | null },
): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    '';
  return fromMeta || user.email?.split('@')[0] || '';
}

/**
 * Identity shown in the header. Prefers the dashboard profile context and
 * otherwise reads it straight from the Supabase auth session (+ profiles row),
 * so public pages reflect login state and account type immediately.
 * Returns `null` when nobody is signed in.
 */
export function useHeaderIdentity(): HeaderIdentity | null {
  const { profile } = useProfile();
  const [sessionIdentity, setSessionIdentity] = useState<HeaderIdentity | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = session?.user;
      if (!user) {
        setSessionIdentity(null);
        return;
      }

      // Immediate paint from the JWT, then refine with the profiles row.
      setSessionIdentity({
        name: nameFromUser(user),
        role: roleFromUserMetadata(user.user_metadata as Record<string, unknown>),
      });

      const { data: row } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled || !row) return;

      setSessionIdentity((prev) => ({
        name: (row.full_name as string | null)?.trim() || prev?.name || nameFromUser(user),
        role: parseRole(row.role as string | null) ?? prev?.role ?? null,
      }));
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setSessionIdentity(null);
      else if (event === 'SIGNED_IN') void load();
    });

    function onAppSignOut() {
      setSessionIdentity(null);
    }
    window.addEventListener('builbid:sign-out', onAppSignOut);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('builbid:sign-out', onAppSignOut);
    };
  }, []);

  if (profile) {
    return {
      name: profile.full_name?.trim() || sessionIdentity?.name || 'User',
      role: parseRole(profile.role),
    };
  }
  return sessionIdentity;
}
