import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Refresh Supabase session tokens so Server Components receive
  // up-to-date cookies. No redirect logic here — auth protection is
  // handled inside each dashboard Server Component directly.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl;

  // Only validate session with Auth server on routes that need fresh JWT (avoids ~200–500ms on public pages).
  const needsAuthServerCheck =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/provider') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth');

  if (needsAuthServerCheck) {
    await supabase.auth.getUser();
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run the proxy on EVERY route EXCEPT:
     *   - /_next/static   (build assets — never need a session)
     *   - /_next/image    (image optimisation — never need a session)
     *   - /favicon.ico    (browser default request)
     *   - any path with a file extension (fonts, svg, png …)
     *
     * NOTE: /dashboard, /login, /register, /auth/callback are all
     * included so that the proxy can refresh the Supabase session token
     * before the server component reads it.  No redirect logic lives here;
     * auth guards live inside the server components themselves.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
}
