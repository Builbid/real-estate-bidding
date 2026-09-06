/** Sole email allowed into the Official Admin Portal. */
export const BUILBID_OFFICIAL_ADMIN_EMAIL = 'builbidcorp@gmail.com';

export function isOfficialAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === BUILBID_OFFICIAL_ADMIN_EMAIL;
}

export const ADMIN_UNAUTHORIZED_MESSAGE =
  'Unauthorized. Access restricted to official staff only.';
