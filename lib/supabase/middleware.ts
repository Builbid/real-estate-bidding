import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isOfficialAdminEmail } from '@/lib/admin/constants';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
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
