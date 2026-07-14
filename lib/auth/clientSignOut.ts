'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { createClient } from '@/lib/supabase/client';

/**
 * Fast client sign-out: clear local session cookies immediately, then client-navigate.
 * Avoids a full server round-trip through /auth/signout.
 */
export async function clientSignOut(
  router: AppRouterInstance,
  options?: { redirectTo?: string; onClear?: () => void },
): Promise<void> {
  options?.onClear?.();

  try {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('[clientSignOut] local sign-out failed:', err);
  }

  const redirectTo = options?.redirectTo ?? '/';
  router.replace(redirectTo);
  router.refresh();
}
