import { cookies } from 'next/headers';
import { createClient as createIsolatedClient, type Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_PORTAL_COOKIE, isPublicPortal, portalForRole, type Portal } from '@/lib/auth/portal';
import { getDashboardPath } from '@/lib/auth/roles';
import { resolveAccountRole, STAFF_USE_PORTAL_MESSAGE } from '@/lib/auth/resolveAccountRole';

/** Remember the last-used customer portal (owner | worker). Never records admin. */
export async function setActivePortalCookie(portal: Portal | null): Promise<void> {
  const store = await cookies();
  if (portal && isPublicPortal(portal)) {
    store.set(ACTIVE_PORTAL_COOKIE, portal, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  } else if (!portal) {
    store.delete(ACTIVE_PORTAL_COOKIE);
  }
}

/** Store an existing Supabase session in ONE portal's cookie namespace. */
export async function persistPortalSession(portal: Portal, session: Pick<Session, 'access_token' | 'refresh_token'>) {
  const supabase = await createClient(portal);
  return supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export type IsolatedSignInResult =
  | { error: string }
  | { error: null; portal: Portal; role: string | null; redirectPath: string };

/**
 * Customer password sign-in on the server. Verifies credentials with a
 * non-persisting client, resolves the account's role, then stores the session
 * only in that role's namespace. Staff accounts are refused here.
 */
export async function signInCustomerIsolated(
  email: string,
  password: string,
): Promise<IsolatedSignInResult> {
  const probe = createIsolatedClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const { data, error } = await probe.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return { error: error?.message ?? 'Sign in failed.' };
  }

  const role = await resolveAccountRole(probe, data.user);
  const portal = portalForRole(role);
  if (portal === 'admin') return { error: STAFF_USE_PORTAL_MESSAGE };

  const target: Portal = portal ?? 'owner';
  const { error: sessionError } = await persistPortalSession(target, data.session);
  if (sessionError) return { error: sessionError.message };

  await setActivePortalCookie(target);
  return { error: null, portal: target, role, redirectPath: getDashboardPath(role) };
}
