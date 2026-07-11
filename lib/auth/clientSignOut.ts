'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { createClient } from '@/lib/supabase/client';

/** Navigate immediately on sign-out only — never call this for normal home navigation. */
export function clientSignOut(
  router: AppRouterInstance,
  options?: { redirectTo?: string; onClear?: () => void },
): void {
  const redirectTo = options?.redirectTo ?? '/';
  options?.onClear?.();
  void createClient().auth.signOut();
  router.push(redirectTo);
}
