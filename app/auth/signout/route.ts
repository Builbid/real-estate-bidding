export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

async function signOutWithTimeout(): Promise<void> {
  const supabase = await createClient();
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
    await signOutWithTimeout();
  } catch (err) {
    console.error('[auth/signout] GET signOut failed:', err);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function POST() {
  try {
    await signOutWithTimeout();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[auth/signout] POST signOut failed:', err);
    return NextResponse.json({ ok: false, error: 'Sign-out failed' }, { status: 500 });
  }
}
