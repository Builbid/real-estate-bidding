import type { SupabaseClient } from '@supabase/supabase-js';
import { isOfficialAdminEmail } from '@/lib/admin/constants';

/** Unique, valid 6-digit Indian pin codes from a comma / space / newline separated string or array. */
export function normalizePincodes(raw: string | string[] | null | undefined): string[] {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(/[\s,;]+/);
  const out = new Set<string>();
  for (const part of parts) {
    const digits = String(part).replace(/\D/g, '');
    if (/^[1-9]\d{5}$/.test(digits)) out.add(digits);
  }
  return [...out];
}

export function pincodeKey(pincode: string | null | undefined): string {
  return String(pincode ?? '').replace(/\D/g, '').slice(0, 6);
}

export function inTerritory(
  pincode: string | null | undefined,
  territory: readonly string[],
): boolean {
  const key = pincodeKey(pincode);
  return key.length === 6 && territory.includes(key);
}

/** Pin codes assigned to a supervisor. Empty when none are assigned (or the column is not migrated). */
export async function loadSupervisorTerritory(
  admin: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from('supervisors')
    .select('assigned_pincodes')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return [];
  return normalizePincodes((data.assigned_pincodes as string[] | null) ?? []);
}

/**
 * Returns an error message when a supervisor tries to act on a project outside their
 * territory. The official admin is never restricted.
 */
export async function projectTerritoryError(
  admin: SupabaseClient,
  session: { userId: string; email: string },
  projectId: string,
): Promise<string | null> {
  if (isOfficialAdminEmail(session.email)) return null;
  const [territory, { data: project }] = await Promise.all([
    loadSupervisorTerritory(admin, session.userId),
    admin.from('projects').select('pincode').eq('id', projectId).maybeSingle(),
  ]);
  if (!project || !inTerritory(project.pincode, territory)) {
    return 'This project is outside your assigned pin code territory.';
  }
  return null;
}
