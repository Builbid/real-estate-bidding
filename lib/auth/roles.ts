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
    default:
      return 'labour_contractor';
  }
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
    default:
      return '/dashboard/builder';
  }
}

export function isBidderRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'labour_contractor' || normalized === 'construction_firm';
}
