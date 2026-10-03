import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { parseRole, roleFromUserMetadata } from '@/lib/auth/roles';

/**
 * Role of the account behind an authenticated client. The database role wins;
 * JWT metadata is only a fallback. Official admin email is always staff.
 * Returns the raw role string (e.g. 'owner', 'field_supervisor') or null.
 */
export async function resolveAccountRole(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
): Promise<string | null> {
  if (isOfficialAdminEmail(user.email)) return 'admin';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const fromDb = parseRole((profile as { role?: string } | null)?.role);
  if (fromDb) return fromDb;

  const { data: provider } = await supabase
    .from('service_providers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (provider) return 'service_provider';

  return roleFromUserMetadata(user.user_metadata as Record<string, unknown>);
}

export const STAFF_USE_PORTAL_MESSAGE =
  'Supervisor / Admin accounts must sign in through the Supervisor Portal (/admin/login). Home Owner and Mistri accounts use a different email.';
