import { PUBLIC_PORTALS, isPortalAuthCookie } from '@/lib/auth/portal';

/** Supabase SSR session cookies, excluding the PKCE verifier. */
export function isSupabaseAuthCookieName(name: string): boolean {
  return name.includes('-auth-token') && !name.includes('code-verifier');
}

export function hasSupabaseAuthCookie(
  cookies: Array<{ name: string; value?: string }>,
): boolean {
  return cookies.some((cookie) => isSupabaseAuthCookieName(cookie.name) && Boolean(cookie.value));
}

/**
 * True when a Home Owner or Mistri/Worker session cookie exists in the browser.
 * The Supervisor/Admin namespace is intentionally ignored: a staff session must
 * never make the public site look "logged in" as a customer.
 */
export function documentHasSupabaseAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => {
    const name = part.trim().split('=')[0] ?? '';
    return PUBLIC_PORTALS.some((portal) => isPortalAuthCookie(name, portal));
  });
}
