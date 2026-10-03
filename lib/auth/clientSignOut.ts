'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { createClient, resolveBrowserPortal, setActivePortalHint } from '@/lib/supabase/client';
import {
  PUBLIC_PORTALS,
  hasPortalSession,
  isPortalAuthCookie,
  portalLoginPath,
  type Portal,
} from '@/lib/auth/portal';

function documentCookies(): Array<{ name: string; value: string }> {
  if (typeof document === 'undefined') return [];
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf('=');
      return { name: eq === -1 ? part : part.slice(0, eq), value: eq === -1 ? '' : part.slice(eq + 1) };
    });
}

/** Remove ONLY this portal's auth cookies / storage — never another portal's. */
function clearPortalAuthStorage(portal: Portal) {
  if (typeof window === 'undefined') return;

  documentCookies()
    .filter((c) => isPortalAuthCookie(c.name, portal) || c.name === `sb-bb-${portal}-auth-token-code-verifier`)
    .forEach((c) => {
      document.cookie = `${c.name}=; path=/; max-age=0; samesite=lax`;
    });

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && isPortalAuthCookie(key, portal)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore quota / private-mode storage errors.
  }
}

/**
 * Sign out of ONE portal and force a full document load so header/avatar UI
 * cannot stay cached as logged-in. Other portals' sessions are left intact.
 */
export async function clientSignOut(
  router?: AppRouterInstance,
  options?: { redirectTo?: string; onClear?: () => void; portal?: Portal },
): Promise<void> {
  const portal = options?.portal ?? resolveBrowserPortal();

  try {
    // scope: 'local' => only this browser session; never revokes other sessions.
    await createClient(portal).auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('[clientSignOut] local sign-out failed:', err);
  }

  clearPortalAuthStorage(portal);

  // Keep the "last used" hint pointing at a portal that is still signed in.
  const remaining = PUBLIC_PORTALS.find(
    (p) => p !== portal && hasPortalSession(documentCookies(), p),
  );
  setActivePortalHint(remaining ?? null);

  options?.onClear?.();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('builbid:sign-out', { detail: { portal } }));
  }

  const redirectTo = options?.redirectTo ?? (portal === 'admin' ? portalLoginPath('admin') : '/');

  if (typeof window !== 'undefined') {
    window.location.replace(redirectTo);
    return;
  }

  router?.push(redirectTo);
  router?.refresh();
}
