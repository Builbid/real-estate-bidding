import type { UserRole } from '@/lib/types';

/** Map legacy JWT / metadata role strings to current DB roles. */
export function normalizeRole(role: string | null | undefined): UserRole {
  switch (role) {
    case 'owner':
      return 'owner';
    case 'admin':
      return 'admin';
    case 'labour_contractor':
    case 'builder':
      return 'labour_contractor';
    case 'construction_firm':
      return 'construction_firm';
    case 'service_provider':
      return 'service_provider';
    default:
      return 'labour_contractor';
  }
}

/** Role from the JWT only — no database lookup. */
export function roleFromUserMetadata(
  meta: Record<string, unknown> | null | undefined,
): UserRole | null {
  if (!meta) return null;
  if (meta.role === 'service_provider') return 'service_provider';
  const flag = meta.hire_service_provider;
  if (flag === true || flag === 'true') return 'service_provider';
  if (typeof meta.role === 'string' && meta.role.trim()) {
    return normalizeRole(meta.role);
  }
  return null;
}

/** Labour-contractor JWT can also be a trade provider — confirm against DB when needed. */
export function needsServiceProviderLookup(role: UserRole | null): boolean {
  return role == null || role === 'labour_contractor';
}

/** Dashboard URL — labour contractors keep /dashboard/builder route. */
export function getDashboardPath(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'owner':
      return '/dashboard/owner';
    case 'labour_contractor':
      return '/dashboard/builder';
    case 'construction_firm':
      return '/dashboard/firm';
    case 'admin':
      return '/dashboard/admin';
    case 'service_provider':
      return '/dashboard/provider';
    default:
      return '/dashboard/builder';
  }
}

export function isBidderRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return (
    normalized === 'labour_contractor' ||
    normalized === 'construction_firm' ||
    normalized === 'service_provider'
  );
}
