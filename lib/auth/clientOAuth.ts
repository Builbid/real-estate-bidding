'use client';

import { createClient } from '@/lib/supabase/client';
import { getSiteOrigin } from '@/lib/auth/getSiteOrigin';

interface GoogleSignInOptions {
  nextPath?: string;
  roleHint?: string | null;
}

export async function signInWithGoogle(
  options: GoogleSignInOptions = {},
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const origin = getSiteOrigin();

  const params = new URLSearchParams();
  if (options.nextPath?.startsWith('/')) {
    params.set('next', options.nextPath);
  }
  if (options.roleHint) {
    params.set('role', options.roleHint);
  }

  const query = params.toString();
  const redirectTo = `${origin}/auth/callback${query ? `?${query}` : ''}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
