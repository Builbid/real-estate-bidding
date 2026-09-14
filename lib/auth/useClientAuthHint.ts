'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { documentHasSupabaseAuthCookie } from '@/lib/auth/authCookie';
import { roleFromUserMetadata } from '@/lib/auth/roles';

export type ClientAuthHint = {
  isAuthenticated: boolean;
  role: string | null;
};

function subscribeNoop() {
  return () => {};
}

function useHasAuthCookie(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    documentHasSupabaseAuthCookie,
    () => false,
  );
}

/** JWT/session hint without blocking the server render or hitting profiles. */
export function useClientAuthHint(serverHint?: ClientAuthHint | null): ClientAuthHint {
  const hasCookie = useHasAuthCookie();
  const [role, setRole] = useState<string | null>(serverHint?.role ?? null);

  useEffect(() => {
    if (serverHint?.role) {
      setRole(serverHint.role);
      return;
    }

    let cancelled = false;
    void createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled || !session?.user) return;
        setRole(roleFromUserMetadata(session.user.user_metadata as Record<string, unknown>));
      });

    return () => {
      cancelled = true;
    };
  }, [serverHint?.role]);

  return {
    isAuthenticated: Boolean(serverHint?.isAuthenticated) || hasCookie || Boolean(role),
    role: role ?? serverHint?.role ?? null,
  };
}
