import { parseRole } from '@/lib/auth/roles';
type RoleMessageKey =
  | 'roles.owner'
  | 'roles.labour_contractor'
  | 'roles.construction_firm'
  | 'roles.admin'
  | 'roles.service_provider'
  | 'roles.field_supervisor';

/** Badge text under the user name (specialty name for service providers). */
export function getProfileRoleLabel(
  profile: { role: string; role_display?: string | null; service_type?: string | null },
  t: (key: RoleMessageKey) => string,
): string {
  const custom = profile.role_display?.trim();
  if (custom) return custom;
  const normalized = parseRole(profile.role);
  // Unknown stored value: show it as-is rather than mislabel the account.
  if (!normalized) return profile.role;
  return t(`roles.${normalized}` as RoleMessageKey);
}
