'use client';

import { createClient as createIsolatedClient } from '@supabase/supabase-js';
import { createClient, setActivePortalHint } from '@/lib/supabase/client';
import { getDashboardPath } from '@/lib/auth/roles';
import { portalForRole } from '@/lib/auth/portal';
import { resolveAccountRole, STAFF_USE_PORTAL_MESSAGE } from '@/lib/auth/resolveAccountRole';

/**
 * Customer sign-in (Home Owner / Mistri-Worker).
 *
 * The password is verified with a throw-away, non-persisting client first, so a
 * wrong-role login (e.g. a supervisor email on /login) never writes or replaces
 * any browser session. Only after the role is known is the session stored — in
 * that role's own cookie namespace, leaving every other portal untouched.
 */
export async function clientSignIn(
  email: string,
  password: string,
): Promise<{ error: string | null; redirectPath: string }> {
  const probe = createIsolatedClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const { data, error } = await probe.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session || !data.user) {
    return { error: error?.message ?? 'Sign in failed.', redirectPath: '/dashboard' };
  }

  const role = await resolveAccountRole(probe, data.user);
  const portal = portalForRole(role);

  if (portal === 'admin') {
    return { error: STAFF_USE_PORTAL_MESSAGE, redirectPath: '/admin/login' };
  }

  // Unknown role (no profile yet): default the namespace to 'owner' but never guess a dashboard.
  const targetPortal = portal ?? 'owner';
  const supabase = createClient(targetPortal);
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (sessionError) {
    return { error: sessionError.message, redirectPath: '/dashboard' };
  }

  setActivePortalHint(targetPortal);

  return { error: null, redirectPath: getDashboardPath(role) };
}
