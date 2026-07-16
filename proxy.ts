import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthMarketingRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/') ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  if (isAuthMarketingRoute) {
    return NextResponse.next({ request });
  }

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
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
}
