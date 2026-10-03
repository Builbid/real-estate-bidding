import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ACTIVE_PORTAL_COOKIE,
  isPublicPortal,
  portalCookieOptions,
  portalForPath,
  resolvePublicPortal,
  type Portal,
} from '@/lib/auth/portal';

function readDocumentCookies(): Array<{ name: string; value: string }> {
  if (typeof document === 'undefined') return [];
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf('=');
      return eq === -1
        ? { name: part, value: '' }
        : { name: part.slice(0, eq), value: decodeURIComponent(part.slice(eq + 1)) };
    });
}

/** Portal whose session this page should use (path first, then the last-used customer portal). */
export function resolveBrowserPortal(): Portal {
  const cookies = readDocumentCookies();
  const active = cookies.find((c) => c.name === ACTIVE_PORTAL_COOKIE)?.value;
  const pathPortal = typeof window !== 'undefined' ? portalForPath(window.location.pathname) : null;
  return pathPortal ?? resolvePublicPortal(cookies, active);
}

/** Remember which customer portal (owner | worker) was used last. Never records admin. */
export function setActivePortalHint(portal: Portal | null): void {
  if (typeof document === 'undefined') return;
  if (portal && isPublicPortal(portal)) {
    document.cookie = `${ACTIVE_PORTAL_COOKIE}=${portal}; path=/; max-age=31536000; samesite=lax`;
  } else if (!portal) {
    document.cookie = `${ACTIVE_PORTAL_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

const cache = new Map<Portal, SupabaseClient>();

/**
 * Browser Supabase client bound to ONE auth-cookie namespace. Clients are cached
 * per portal so each portal keeps its own independent session state.
 */
export function createClient(portal?: Portal): SupabaseClient {
  const resolved = portal ?? resolveBrowserPortal();
  const isBrowser = typeof window !== 'undefined';

  if (isBrowser) {
    const existing = cache.get(resolved);
    if (existing) return existing;
  }

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Per-portal storage key + our own cache: the library's global singleton would
      // otherwise hand every portal the same client and session.
      isSingleton: false,
      cookieOptions: portalCookieOptions(resolved),
    },
  ) as unknown as SupabaseClient;

  if (isBrowser) cache.set(resolved, client);
  return client;
}
