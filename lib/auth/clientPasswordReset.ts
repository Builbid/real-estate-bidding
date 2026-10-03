'use client';

import { createClient, resolveBrowserPortal } from '@/lib/supabase/client';
import { getSiteOrigin } from '@/lib/auth/getSiteOrigin';

export async function requestPasswordReset(
  email: string,
): Promise<{ error: string | null }> {
  const resolved = resolveBrowserPortal();
  const portal = resolved === 'admin' ? 'owner' : resolved;
  const supabase = createClient(portal);
  const origin = getSiteOrigin();
  const redirectTo = `${origin}/auth/callback?portal=${portal}&next=${encodeURIComponent('/reset-password')}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function updatePassword(
  password: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
