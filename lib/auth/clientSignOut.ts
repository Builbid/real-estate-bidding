'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { createClient } from '@/lib/supabase/client';

function clearBrowserAuthStorage() {
  if (typeof window === 'undefined') return;

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('sb-') ||
          key.includes('supabase') ||
          key.includes('auth-token'))
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore quota / private-mode storage errors.
  }

  try {
    sessionStorage.clear();
  } catch {
    // Ignore quota / private-mode storage errors.
  }
}

/**
 * Sign out and force a full document load so header/avatar UI cannot stay
 * cached as logged-in (Next.js App Router RSC cache + nested ProfileProviders).
 */
export async function clientSignOut(
  router?: AppRouterInstance,
  options?: { redirectTo?: string; onClear?: () => void },
): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('[clientSignOut] local sign-out failed:', err);
  }

  options?.onClear?.();
  clearBrowserAuthStorage();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('builbid:sign-out'));
  }

  const redirectTo = options?.redirectTo ?? '/';

  if (typeof window !== 'undefined') {
    window.location.replace(redirectTo);
    return;
  }

  router?.push(redirectTo);
  router?.refresh();
}
