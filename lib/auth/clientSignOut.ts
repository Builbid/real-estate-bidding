'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { createClient } from '@/lib/supabase/client';

/** Navigate immediately, then clear the session in the background. */
export function clientSignOut(
  router: AppRouterInstance,
  options?: { redirectTo?: string; onClear?: () => void },
): void {
  const redirectTo = options?.redirectTo ?? '/';
  options?.onClear?.();
  router.push(redirectTo);
  router.refresh();
  void createClient().auth.signOut();
}
