/** Roles shown on service provider signup — bidding roles redirect to existing signup URLs */
export const SERVICE_PROVIDER_SIGNUP_ROLES = [
  {
    value: 'labour_contractor',
    label: 'Labour contractor',
    redirectHref: '/signup/bidder/labour-contractor',
  },
  {
    value: 'construction_firm',
    label: 'Construction Firm',
    redirectHref: '/signup/bidder/construction-firm',
  },
  { value: 'painter', label: 'Painter', categorySlug: 'painter' },
  { value: 'carpenter', label: 'Carpenter', categorySlug: 'carpenter' },
  { value: 'electrician', label: 'Electrician', categorySlug: 'electrician' },
  { value: 'plumber', label: 'Plumber', categorySlug: 'plumber' },
  { value: 'earthwork', label: 'Earthwork', categorySlug: 'earthwork' },
  {
    value: 'false_ceiling_work',
    label: 'False ceiling work',
    categorySlug: 'false-ceiling-work',
  },
] as const;

export type ServiceProviderSignupRoleValue =
  (typeof SERVICE_PROVIDER_SIGNUP_ROLES)[number]['value'];

export function isBiddingSignupRole(value: string): boolean {
  return value === 'labour_contractor' || value === 'construction_firm';
}

export function getBiddingSignupRedirect(value: string): string | null {
  const row = SERVICE_PROVIDER_SIGNUP_ROLES.find((r) => r.value === value);
  if (row && 'redirectHref' in row) return row.redirectHref;
  return null;
}

export function getTradeCategorySlug(value: string): string | null {
  const row = SERVICE_PROVIDER_SIGNUP_ROLES.find((r) => r.value === value);
  if (row && 'categorySlug' in row) return row.categorySlug;
  return null;
}
