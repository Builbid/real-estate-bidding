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

/** Supervisor commission: 20 basis points = 0.2% of the project's final total budget. */
export const SUPERVISOR_PAYOUT_BPS = 20;

/** Floor and cap on the 0.2% commission, in rupees. */
export const SUPERVISOR_EARNING_MIN = 600;
export const SUPERVISOR_EARNING_MAX = 1200;

/** Human readable commission rate, e.g. "0.2%". */
export const SUPERVISOR_PAYOUT_LABEL = `${(SUPERVISOR_PAYOUT_BPS / 100).toString()}%`;

/**
 * Supervisor earning from the final total budget:
 * 0.2% (`budget * 0.002`), then ₹600 minimum and ₹1,200 maximum.
 * A missing or non-positive budget earns nothing.
 */
export function calculateSupervisorCommission(projectValue: number | null | undefined): number {
  const value = Number(projectValue);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return clampSupervisorEarning(value * 0.002);
}

/** Apply the ₹600–₹1,200 band to a commission that is already in rupees. */
export function clampSupervisorEarning(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const rounded = Math.round(amount);
  if (rounded < SUPERVISOR_EARNING_MIN) return SUPERVISOR_EARNING_MIN;
  if (rounded > SUPERVISOR_EARNING_MAX) return SUPERVISOR_EARNING_MAX;
  return rounded;
}

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
