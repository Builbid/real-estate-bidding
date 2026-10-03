'use client';

import { createClient } from '@/lib/supabase/client';
import {
  getDashboardPath,
  needsServiceProviderLookup,
  roleFromUserMetadata,
} from '@/lib/auth/roles';

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

  // Database role is authoritative; JWT metadata can be stale.
  const { data: dbProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (dbProfile?.role) {
    return { error: null, redirectPath: getDashboardPath(dbProfile.role) };
  }

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const metaRole = roleFromUserMetadata(meta);

  if (metaRole && !needsServiceProviderLookup(metaRole)) {
    return { error: null, redirectPath: getDashboardPath(metaRole) };
  }

  const { data: provider } = await supabase
    .from('service_providers')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (provider) {
    return { error: null, redirectPath: getDashboardPath('service_provider') };
  }

  if (metaRole) {
    return { error: null, redirectPath: getDashboardPath(metaRole) };
  }

  return { error: null, redirectPath: getDashboardPath(null) };
}
