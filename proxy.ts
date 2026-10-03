import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isActiveTestingSupervisor, isOfficialAdminEmail } from '@/lib/admin/constants'
import { getDashboardPath, roleFromUserMetadata } from '@/lib/auth/roles'
import {
  ACTIVE_PORTAL_COOKIE,
  PORTAL_HEADER,
  hasPortalSession,
  portalCookieOptions,
  portalForPath,
  portalForRole,
  portalLoginPath,
  resolvePublicPortal,
  type Portal,
} from '@/lib/auth/portal'

/**
 * Strict 3-way access control.
 *
 *   Home Owner      -> /dashboard/owner            (owner cookie namespace)
 *   Mistri / Worker -> /dashboard/worker|builder|firm|provider  (worker namespace)
 *   Supervisor      -> /admin/dashboard            (admin namespace)
 *
 * Each namespace is a separate Supabase auth cookie, so a session in one
 * portal is never visible to, refreshed by, or cleared by another.
 */

const AUTH_MARKETING_ROUTES = new Set([
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
])

function isAuthMarketingRoute(pathname: string): boolean {
  return AUTH_MARKETING_ROUTES.has(pathname) || pathname.startsWith('/signup/')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const pathPortal = portalForPath(pathname)

  /** Forward the resolved namespace to server code (never trust a client-sent value). */
  function forwardedHeaders(): Headers {
    const headers = new Headers(request.headers)
    headers.delete(PORTAL_HEADER)
    if (pathPortal) headers.set(PORTAL_HEADER, pathPortal)
    return headers
  }

  let response = NextResponse.next({ request: { headers: forwardedHeaders() } })

  if (isAuthMarketingRoute(pathname)) {
    return response
  }

  function clientFor(portal: Portal) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: portalCookieOptions(portal),
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request: { headers: forwardedHeaders() } })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            )
          },
        },
      },
    )
  }

  const cookies = request.cookies.getAll()
  const redirectTo = (path: string, search?: Record<string, string>) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ''
    Object.entries(search ?? {}).forEach(([k, v]) => url.searchParams.set(k, v))
    return NextResponse.redirect(url)
  }

  /** Account behind the session stored in `portal`'s cookie namespace, if any. */
  async function sessionIdentity(portal: Portal) {
    if (!hasPortalSession(cookies, portal)) return null
    const supabase = clientFor(portal)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_verified, staff_position')
      .eq('id', user.id)
      .maybeSingle()

    const role =
      (profile?.role as string | undefined) ??
      roleFromUserMetadata(user.user_metadata as Record<string, unknown>) ??
      null
    return { user, profile, role }
  }

  /** Customer (owner | worker) session that exists, used for cross-role redirects. */
  async function otherCustomerHome(skip?: Portal): Promise<string | null> {
    for (const portal of ['owner', 'worker'] as const) {
      if (portal === skip) continue
      const identity = await sessionIdentity(portal)
      if (!identity) continue
      const target = portalForRole(identity.role)
      if (target === portal) return getDashboardPath(identity.role)
    }
    return null
  }

  // ── Legacy admin dashboard path: staff live under /admin only ────────────
  if (pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/')) {
    return redirectTo('/admin/dashboard')
  }

  // ── Supervisor / Admin portal ────────────────────────────────────────────
  if (pathPortal === 'admin') {
    if (pathname === '/admin/signup') return response

    const isLogin = pathname === '/admin/login'
    let allowed = false

    if (hasPortalSession(cookies, 'admin')) {
      const supabase = clientFor('admin')
      // getUser() validates the token with Auth — the staff portal is not read from the cookie alone.
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_verified, staff_position')
          .eq('id', user.id)
          .maybeSingle()
        allowed = isOfficialAdminEmail(user.email) || isActiveTestingSupervisor(profile)
      }
    }

    if (isLogin) {
      return allowed ? redirectTo('/admin/dashboard') : response
    }

    if (!allowed) {
      // A signed-in Owner / Worker is sent to their own dashboard, never into the staff portal.
      const home = await otherCustomerHome()
      return home ? redirectTo(home) : redirectTo(portalLoginPath('admin'))
    }
    return response
  }

  // ── Customer dashboards (owner / worker / shared) ────────────────────────
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/provider')) {
    const active = request.cookies.get(ACTIVE_PORTAL_COOKIE)?.value
    const portal: 'owner' | 'worker' =
      pathPortal === 'owner' || pathPortal === 'worker'
        ? pathPortal
        : resolvePublicPortal(cookies, active)

    const login = () => redirectTo('/login', { next: pathname })

    if (!hasPortalSession(cookies, portal)) {
      // Logged in under the other customer portal? Send them to THEIR dashboard.
      if (pathPortal) {
        const home = await otherCustomerHome(portal)
        if (home) return redirectTo(home)
      }
      return login()
    }

    const identity = await sessionIdentity(portal)
    if (!identity) return login()

    const ownPortal = portalForRole(identity.role)

    if (ownPortal === 'admin') {
      // Staff accounts never use customer dashboards.
      return redirectTo(portalLoginPath('admin'))
    }

    if (ownPortal && ownPortal !== portal) {
      // Session sits in the wrong namespace for its role — go to the role's own dashboard.
      return redirectTo(getDashboardPath(identity.role))
    }

    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
}
