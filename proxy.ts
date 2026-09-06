import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isOfficialAdminEmail } from '@/lib/admin/constants'

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

  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'
  const needsAuthServerCheck =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/provider') ||
    isAdminRoute ||
    pathname.startsWith('/auth');

  if (!needsAuthServerCheck) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Official admin portal — email-gated (except login page)
  if (isAdminRoute) {
    if (isAdminLogin) {
      if (user && isOfficialAdminEmail(user.email)) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/dashboard';
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    if (!user || !isOfficialAdminEmail(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = '';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (
    (pathname.startsWith('/dashboard') || pathname.startsWith('/provider')) &&
    !user
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
}
