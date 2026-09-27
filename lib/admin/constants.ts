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

export function isActiveTestingSupervisor(profile: {
  role?: string | null;
  is_verified?: boolean | null;
} | null | undefined): boolean {
  return profile?.role === TESTING_FIELD_SUPERVISOR_ROLE && profile.is_verified === true;
}
