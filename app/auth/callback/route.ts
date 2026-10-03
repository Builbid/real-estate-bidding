export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDashboardPath } from '@/lib/auth/roles';

function safeNextPath(next: string | null): string {
  if (next?.startsWith('/')) return next;
  return '/dashboard';
}

const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;

async function applyOAuthRoleHint(
  supabase: SupabaseClient,
  userId: string,
  roleHint: string | null,
) {
  if (!roleHint) return;

  let role = roleHint;
  if (role === 'bidder') role = 'labour_contractor';
  if (!['owner', 'labour_contractor', 'construction_firm'].includes(role)) return;

  // Role lock: a hint may only seed a brand-new account. Returning users who
  // sign in through a differently-hinted login page (e.g. an owner using the
  // contractor login with Google) must keep their stored role.
  const { data: existing } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .maybeSingle();
  const createdAt = existing?.created_at ? new Date(existing.created_at).getTime() : NaN;
  const isNewAccount = Number.isFinite(createdAt) && Date.now() - createdAt < NEW_ACCOUNT_WINDOW_MS;
  if (!isNewAccount) return;

  const serviceType = role === 'owner' ? null : role;

  await supabase
    .from('profiles')
    .update({ role, service_type: serviceType })
    .eq('id', userId);
}

async function resolveRedirectPath(
  supabase: SupabaseClient,
  userId: string,
  next: string,
): Promise<string> {
  if (next !== '/dashboard') return next;

  // Database role first — JWT metadata can be stale.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.role) return getDashboardPath(profile.role);

  const { data: { user } } = await supabase.auth.getUser();
  const metaRole = user?.user_metadata?.role as string | undefined;
  return getDashboardPath(metaRole);
}

/**
 * Handles email confirmation, password recovery, and OAuth callbacks.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));
  const roleHint = searchParams.get('role');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await applyOAuthRoleHint(supabase, user.id, roleHint);

    const fullName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined);
    if (fullName?.trim()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (!profile?.full_name?.trim()) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName.trim() })
          .eq('id', user.id);
      }
    }

    const destination = await resolveRedirectPath(supabase, user.id, next);
    return NextResponse.redirect(`${origin}${destination}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
