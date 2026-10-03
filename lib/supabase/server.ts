import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import {
  ACTIVE_PORTAL_COOKIE,
  PORTAL_HEADER,
  isPortal,
  portalCookieOptions,
  resolvePortal,
  type Portal,
} from '@/lib/auth/portal';

/**
 * Server Supabase client bound to ONE auth-cookie namespace.
 *
 * - `/admin/*`            -> admin session
 * - `/dashboard/owner/*`  -> owner session
 * - worker dashboards     -> worker session
 * - shared / public paths -> the customer session last used (owner | worker)
 *
 * Pass `portal` to force a namespace (e.g. when establishing a session).
 */
export async function createClient(portal?: Portal) {
  const cookieStore = await cookies();

  let resolved = portal;
  if (!resolved) {
    const headerStore = await headers();
    const fromHeader = headerStore.get(PORTAL_HEADER);
    resolved = resolvePortal(
      isPortal(fromHeader) ? fromHeader : null,
      cookieStore.getAll(),
      cookieStore.get(ACTIVE_PORTAL_COOKIE)?.value,
    );
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: portalCookieOptions(resolved),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — ignore
          }
        },
      },
    }
  );
}

/** Explicit alias for call sites that must never depend on request context. */
export const createPortalClient = createClient;
