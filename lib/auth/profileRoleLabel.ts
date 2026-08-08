import { normalizeRole } from '@/lib/auth/roles';
import { getProviderSpecialtyLabel, isProviderSpecialtyType } from '@/lib/trades';

type RoleMessageKey =
  | 'roles.owner'
  | 'roles.labour_contractor'
  | 'roles.construction_firm'
  | 'roles.admin'
  | 'roles.service_provider';

/** Badge text under the user name (specialty name for service providers). */
export function getProfileRoleLabel(
  profile: { role: string; role_display?: string | null; service_type?: string | null },
  t: (key: RoleMessageKey) => string,
): string {
  const custom = profile.role_display?.trim();
  if (custom) return custom;
  const normalized = normalizeRole(profile.role);
  if (normalized === 'service_provider' && isProviderSpecialtyType(profile.service_type)) {
    return getProviderSpecialtyLabel(profile.service_type);
  }
  return t(`roles.${normalized}` as RoleMessageKey);
}
