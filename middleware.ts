import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  // Refresh the session so Server Components can read the latest auth state.
  const { data: { user } } = await supabase.auth.getUser()

  // Only guard dashboard routes — everything else is publicly accessible.
  // /login and /register must NEVER be in this block; redirecting them
  // here is what causes ERR_TOO_MANY_REDIRECTS.
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  // ✅ ONLY match /dashboard and its sub-paths.
  // Everything else — /, /login, /register, /project/*, /auth/*, _next/*, assets —
  // is intentionally excluded so the middleware never touches them.
  matcher: ['/dashboard/:path*'],
}
