/** Sole email allowed into the Official Admin Portal. */
export const BUILBID_OFFICIAL_ADMIN_EMAIL = 'builbidcorp@gmail.com';

export function isOfficialAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === BUILBID_OFFICIAL_ADMIN_EMAIL;
}

export const ADMIN_UNAUTHORIZED_MESSAGE =
  'Unauthorized. Access restricted to official staff only.';

/**
 * Dedicated supervisor portal role.
 * TESTING: accounts with this role and is_verified are treated as active.
 * Re-enable interview / manual approval before official production.
 */
export const TESTING_FIELD_SUPERVISOR_ROLE = 'field_supervisor';

/** Accrued supervisor earning until a payout ledger exists (200 bps = 2% of final budget). */
export const SUPERVISOR_PAYOUT_BPS = 200;

const SUPERVISOR_PROFILE_ROLES = new Set(['field_supervisor', 'supervisor']);
export function isActiveTestingSupervisor(profile: {
  role?: string | null;
  is_verified?: boolean | null;
  staff_position?: string | null;
} | null | undefined): boolean {
  if (!profile?.is_verified) return false;
  // The profile ROLE alone decides. A staff_position on an owner / worker account
  // must never open the supervisor portal (strict role separation).
  return !!profile.role && SUPERVISOR_PROFILE_ROLES.has(profile.role);
}
