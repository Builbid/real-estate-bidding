// Server-only: uses the service-role admin client. Import from server actions / route handlers only.
import { createAdminClient } from '@/lib/supabase/admin';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { portalForRole, type Portal } from '@/lib/auth/portal';

export const OFFICIAL_EMAIL_RESERVED_MESSAGE =
  'This email is reserved for the official BuilBid admin portal. Please use a different email address.';

export function separateEmailMessage(existing: Portal | 'unknown', wanted: Portal): string {
  const label = (p: Portal | 'unknown') =>
    p === 'owner' ? 'Home Owner'
      : p === 'worker' ? 'Mistri / Worker'
        : p === 'admin' ? 'Supervisor / Admin'
          : 'another';
  return (
    `This email is already registered as a ${label(existing)} account. ` +
    `Each account type (Home Owner, Mistri / Worker, Supervisor / Admin) needs its own email address — ` +
    `please use a different email to register as ${label(wanted)}.`
  );
}

export type ExistingAccount = {
  id: string;
  /** Portal the existing account belongs to, or 'unknown' if it has no recognisable role. */
  portal: Portal | 'unknown';
};

/** Look up an existing account (any role) by email. Returns null when the email is free. */
export async function findExistingAccountByEmail(rawEmail: string): Promise<ExistingAccount | null> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return null;

  if (isOfficialAdminEmail(email)) {
    return { id: 'official-admin', portal: 'admin' };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .ilike('email', email)
    .maybeSingle();
  if (profile?.id) {
    return { id: profile.id as string, portal: portalForRole(profile.role as string) ?? 'unknown' };
  }

  // Trade providers / half-created accounts may exist in auth without a profile row.
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    const match = data.users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (match) {
      const metaPortal = portalForRole((match.user_metadata as { role?: string } | null)?.role);
      return { id: match.id, portal: metaPortal ?? 'unknown' };
    }
    if (data.users.length < 200) break;
  }

  return null;
}

/**
 * Enforce "one email = one role". Returns an error message when the email is
 * already used by ANY account (a different role, or the same role), else null.
 * Fails open only when the service-role key is unavailable; Supabase Auth and the
 * unique profiles email index still reject exact duplicates in that case.
 */
export async function assertEmailFreeForRole(
  email: string,
  wanted: Portal,
): Promise<string | null> {
  if (isOfficialAdminEmail(email)) return OFFICIAL_EMAIL_RESERVED_MESSAGE;
  try {
    const existing = await findExistingAccountByEmail(email);
    if (!existing) return null;
    if (existing.portal !== wanted) return separateEmailMessage(existing.portal, wanted);
    return 'An account with this email already exists. Please sign in instead.';
  } catch (err) {
    console.error('[emailRoleGuard] lookup skipped:', err);
    return null;
  }
}
