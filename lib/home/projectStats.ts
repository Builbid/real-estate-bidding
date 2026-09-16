/** Public homepage floor for Total Projects. Historical inventory is already in this offset. */
export const BASE_TOTAL_PROJECTS = 100;
/** Public homepage floor for Projects Approved. Always stays below Total Projects. */
export const BASE_APPROVED_PROJECTS = 95;
export const HOME_PUBLIC_CACHE_TAG = 'home-public';

/**
 * Rows created/awarded at or before this instant are represented by the 100/95
 * floors. Only later creates and contractor assignments increment the counters.
 * This prevents adding the full historical DB count on top of the public offset
 * (which previously displayed inflated values like 320 / 181).
 */
export const PUBLIC_STATS_NEW_AFTER_ISO = '2026-09-16T05:43:00.000Z';

const APPROVED_STATUSES = new Set([
  'approved',
  'agreement signed',
  'agreement_signed',
]);

export interface ProjectApprovalRow {
  status?: string | null;
  agreement_completed?: boolean | null;
  selected_builder_id?: string | null;
}

/**
 * A project counts toward "Projects Approved" only when a worker/mistri is
 * assigned. Creating or uploading a project does not qualify.
 */
export function isContractuallyApprovedProject(row: ProjectApprovalRow): boolean {
  if (!row.selected_builder_id) return false;
  if (row.agreement_completed === true) return true;

  const status = String(row.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');

  if (APPROVED_STATUSES.has(status)) return true;

  return String(row.status ?? '').trim().toLowerCase() === 'completed';
}

export interface PublicProjectCounts {
  totalProjects: number;
  approvedProjects: number;
}

/**
 * Public counters:
 *   totalProjects    = 100 + realNewProjectsCountFromDB
 *   approvedProjects = min(95 + realApprovedProjectsCountFromDB, totalProjects - 1)
 *
 * approvedProjects is always strictly smaller than totalProjects.
 */
export function computePublicProjectCounts(
  realNewProjectsCountFromDB: number,
  realApprovedProjectsCountFromDB: number,
): PublicProjectCounts {
  const realNew = Math.max(0, Math.floor(Number(realNewProjectsCountFromDB) || 0));
  const realApproved = Math.max(0, Math.floor(Number(realApprovedProjectsCountFromDB) || 0));

  const totalProjects = BASE_TOTAL_PROJECTS + realNew;
  const approvedProjects = Math.min(
    BASE_APPROVED_PROJECTS + realApproved,
    Math.max(0, totalProjects - 1),
  );

  return { totalProjects, approvedProjects };
}
