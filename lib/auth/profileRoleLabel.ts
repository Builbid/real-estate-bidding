import { normalizeRole } from '@/lib/auth/roles';

type RoleMessageKey =
  | 'roles.owner'
  | 'roles.labour_contractor'
  | 'roles.construction_firm'
  | 'roles.admin'
  | 'roles.service_provider';

/** Badge text under the user name (trade name for hire-services providers). */
export function getProfileRoleLabel(
  profile: { role: string; role_display?: string | null },
  t: (key: RoleMessageKey) => string,
): string {
  const custom = profile.role_display?.trim();
  if (custom) return custom;
  const normalized = normalizeRole(profile.role);
  return t(`roles.${normalized}` as RoleMessageKey);
}
