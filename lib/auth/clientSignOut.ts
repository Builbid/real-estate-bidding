'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Sign out with instant UI feedback: clear local profile state, then hard-navigate
 * to the server sign-out route so Supabase cookies are cleared before landing on home.
 */
export function clientSignOut(
  _router: AppRouterInstance,
  options?: { redirectTo?: string; onClear?: () => void },
): void {
  const redirectTo = options?.redirectTo ?? '/';
  options?.onClear?.();

  if (typeof window === 'undefined') return;

  const next = encodeURIComponent(redirectTo);
  window.location.assign(`/auth/signout?next=${next}`);
}
