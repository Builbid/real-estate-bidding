/**
 * Strict 3-way session separation.
 *
 * Every account type signs in to its own cookie namespace ("portal"), so a
 * session in one portal is never read, refreshed, overwritten, or cleared by
 * another:
 *
 *   owner   Home Owner            -> /dashboard/owner
 *   worker  Mistri / Worker / ... -> /dashboard/worker (builder, firm, provider)
 *   admin   Supervisor / Admin    -> /admin/dashboard
 *
 * This module is dependency-free so it can run in the proxy (edge), on the
 * server, and in the browser.
 */

export type Portal = 'owner' | 'worker' | 'admin';

export const PORTALS: readonly Portal[] = ['owner', 'worker', 'admin'];

/** Portals a customer-facing page may fall back to when the path doesn't decide. */
export const PUBLIC_PORTALS: readonly Portal[] = ['owner', 'worker'];

/** Non-sensitive hint: which public portal was used last (owner | worker). */
export const ACTIVE_PORTAL_COOKIE = 'bb-active-portal';

/** Request header set by the proxy so server code knows which namespace to use. */
export const PORTAL_HEADER = 'x-bb-portal';

export function isPortal(value: unknown): value is Portal {
  return value === 'owner' || value === 'worker' || value === 'admin';
}

export function isPublicPortal(value: unknown): value is 'owner' | 'worker' {
  return value === 'owner' || value === 'worker';
}

/** Supabase auth cookie / storage key for a portal (chunks are `<name>.0`, `<name>.1`, ...). */
export function authCookieName(portal: Portal): string {
  return `sb-bb-${portal}-auth-token`;
}

export function portalCookieOptions(portal: Portal): { name: string } {
  return { name: authCookieName(portal) };
}

type CookieLike = { name: string; value?: string };

export function isPortalAuthCookie(name: string, portal: Portal): boolean {
  const base = authCookieName(portal);
  return name === base || name.startsWith(`${base}.`);
}

export function hasPortalSession(cookies: CookieLike[], portal: Portal): boolean {
  return cookies.some((c) => isPortalAuthCookie(c.name, portal) && Boolean(c.value));
}

// ─── Roles ─────────────────────────────────────────────────────────────────

const STAFF_ROLES = new Set(['admin', 'field_supervisor', 'supervisor']);
const WORKER_ROLES = new Set(['labour_contractor', 'builder', 'construction_firm', 'service_provider']);
const OWNER_ROLES = new Set(['owner', 'home_owner', 'homeowner']);

/** Which portal an account with this database role belongs to. */
export function portalForRole(role: string | null | undefined): Portal | null {
  const r = (role ?? '').trim().toLowerCase();
  if (OWNER_ROLES.has(r)) return 'owner';
  if (WORKER_ROLES.has(r)) return 'worker';
  if (STAFF_ROLES.has(r)) return 'admin';
  return null;
}

export function isStaffRole(role: string | null | undefined): boolean {
  return portalForRole(role) === 'admin';
}

// ─── Paths ─────────────────────────────────────────────────────────────────

const WORKER_PREFIXES = [
  '/dashboard/worker',
  '/dashboard/mistri',
  '/dashboard/builder',
  '/dashboard/firm',
  '/dashboard/provider',
  '/provider',
];

function hasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Portal a path belongs to, or null for shared / public paths. */
export function portalForPath(pathname: string): Portal | null {
  if (hasPrefix(pathname, '/admin')) return 'admin';
  if (hasPrefix(pathname, '/dashboard/admin')) return 'admin';
  if (hasPrefix(pathname, '/dashboard/owner')) return 'owner';
  if (WORKER_PREFIXES.some((p) => hasPrefix(pathname, p))) return 'worker';
  return null;
}

/** Landing dashboard for a portal. */
export function portalHomePath(portal: Portal): string {
  switch (portal) {
    case 'owner':
      return '/dashboard/owner';
    case 'worker':
      return '/dashboard/worker';
    case 'admin':
      return '/admin/dashboard';
  }
}

/** Sign-in page for a portal. */
export function portalLoginPath(portal: Portal): string {
  return portal === 'admin' ? '/admin/login' : '/login';
}

// ─── Neutral-path resolution ───────────────────────────────────────────────

/**
 * For shared/public paths: pick the customer portal to read.
 * Never resolves to `admin` — staff sessions are only read on /admin paths.
 */
export function resolvePublicPortal(
  cookies: CookieLike[],
  activeHint?: string | null,
): 'owner' | 'worker' {
  if (isPublicPortal(activeHint) && hasPortalSession(cookies, activeHint)) return activeHint;
  for (const portal of PUBLIC_PORTALS) {
    if (hasPortalSession(cookies, portal)) return portal as 'owner' | 'worker';
  }
  return isPublicPortal(activeHint) ? activeHint : 'owner';
}

/** Pick the namespace to use given a path-derived portal and the request cookies. */
export function resolvePortal(
  pathPortal: Portal | null,
  cookies: CookieLike[],
  activeHint?: string | null,
): Portal {
  return pathPortal ?? resolvePublicPortal(cookies, activeHint);
}
