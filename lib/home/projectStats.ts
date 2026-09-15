/** Public homepage floor so Total Projects never displays below this value. */
export const BASE_TOTAL_PROJECTS = 160;
/** Public homepage floor for signed-agreement projects. Always 20 below the total baseline. */
export const BASE_APPROVED_PROJECTS = 140;
export const HOME_PUBLIC_CACHE_TAG = 'home-public';

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
 * A project counts toward "Projects Approved" only after a contractual
 * approval / signed-agreement state. Creating or uploading a project does not.
 */
export function isContractuallyApprovedProject(row: ProjectApprovalRow): boolean {
  if (row.agreement_completed === true) return true;

  const status = String(row.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');

  if (APPROVED_STATUSES.has(status)) return true;

  // Existing schema: awarding a builder sets status to completed and generates
  // the signed agreement. That is the Agreement Signed equivalent.
  const rawStatus = String(row.status ?? '').trim().toLowerCase();
  return rawStatus === 'completed' && Boolean(row.selected_builder_id);
}

export interface PublicProjectCounts {
  totalProjects: number;
  approvedProjects: number;
}

/**
 * Public counters:
 *   totalProjects    = 160 + realCountOfAllProjectsInDB
 *   approvedProjects = min(140 + realApproved, totalProjects - 1)
 *
 * approvedProjects is always strictly smaller than totalProjects.
 */
export function computePublicProjectCounts(
  realCountOfAllProjectsInDB: number,
  realCountOfApprovedProjectsInDB: number,
): PublicProjectCounts {
  const realTotal = Math.max(0, Math.floor(Number(realCountOfAllProjectsInDB) || 0));
  const realApproved = Math.max(
    0,
    Math.min(realTotal, Math.floor(Number(realCountOfApprovedProjectsInDB) || 0)),
  );

  const totalProjects = BASE_TOTAL_PROJECTS + realTotal;
  const approvedProjects = Math.min(
    BASE_APPROVED_PROJECTS + realApproved,
    Math.max(0, totalProjects - 1),
  );

  return { totalProjects, approvedProjects };
}
