export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { isPortal, type Portal } from '@/lib/auth/portal';

function portalFromRequest(value: string | null): Portal | undefined {
  return isPortal(value) ? value : undefined;
}

async function signOutWithTimeout(portal?: Portal): Promise<void> {
  // scope: 'local' + an explicit portal => only that portal's session is cleared.
  const supabase = await createClient(portal);
  await Promise.race([
    supabase.auth.signOut({ scope: 'local' }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sign-out timed out')), 1500);
    }),
  ]);
}

function safeRedirectUrl(request: NextRequest, next: string | null): URL {
  const fallback = new URL('/', request.url);
  if (!next || !next.startsWith('/')) return fallback;
  try {
    const target = new URL(next, request.url);
    if (target.origin !== new URL(request.url).origin) return fallback;
    return target;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const redirectUrl = safeRedirectUrl(request, request.nextUrl.searchParams.get('next'));

  try {
    await signOutWithTimeout(portalFromRequest(request.nextUrl.searchParams.get('portal')));
  } catch (err) {
    console.error('[auth/signout] GET signOut failed:', err);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  try {
    await signOutWithTimeout(portalFromRequest(request.nextUrl.searchParams.get('portal')));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[auth/signout] POST signOut failed:', err);
    return NextResponse.json({ ok: false, error: 'Sign-out failed' }, { status: 500 });
  }
}
