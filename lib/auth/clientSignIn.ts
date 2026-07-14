'use client';

import { createClient } from '@/lib/supabase/client';
import { getDashboardPath } from '@/lib/auth/roles';

export async function clientSignIn(
  email: string,
  password: string,
): Promise<{ error: string | null; redirectPath: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: error.message, redirectPath: '/dashboard' };
  }

  const metaRole = data.user.user_metadata?.role as string | undefined;
  if (metaRole) {
    return { error: null, redirectPath: getDashboardPath(metaRole) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  return { error: null, redirectPath: getDashboardPath(profile?.role) };
}
