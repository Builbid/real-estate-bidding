/** Public homepage floor for Projects Uploaded. Historical inventory is already in this offset. */
export const BASE_TOTAL_PROJECTS = 100;
/** Historical signed-agreement floor added to newly completed rows from the database. */
export const BASE_APPROVED_PROJECTS = 95;
/**
 * Projects Completed stays about 3% under Projects Uploaded when the signed
 * count would otherwise look much lower than the upload total.
 */
export const COMPLETED_UPLOAD_DEDUCTION_RATE = 0.03;
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
 * A project counts toward "Projects Completed" only when a worker/mistri is
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

/** Nearest integer about 3% below the uploaded total. Never negative. */
export function completedCountFromUploadBaseline(totalUploaded: number): number {
  const uploaded = Math.max(0, Math.round(Number(totalUploaded) || 0));
  return Math.max(0, Math.round(uploaded * (1 - COMPLETED_UPLOAD_DEDUCTION_RATE)));
}

/**
 * Public counters:
 *   totalProjects    = 100 + realNewProjectsCountFromDB
 *   actualCompleted  = 95 + real signed/agreement rows from the database
 *   approvedProjects = the higher of actualCompleted and ~3% below totalProjects,
 *                      capped at totalProjects so completed never exceeds uploads.
 *
 * The 3% figure is used when signed agreements are far below uploads, so the
 * homepage completed count stays coordinated instead of looking drastically lower.
 * When the signed count is closer to uploads, that actual count is shown.
 * Both values are integers.
 */
export function computePublicProjectCounts(
  realNewProjectsCountFromDB: number,
  realApprovedProjectsCountFromDB: number,
): PublicProjectCounts {
  const realNew = Math.max(0, Math.floor(Number(realNewProjectsCountFromDB) || 0));
  const realApproved = Math.max(0, Math.floor(Number(realApprovedProjectsCountFromDB) || 0));

  const totalProjects = BASE_TOTAL_PROJECTS + realNew;
  const actualCompleted = BASE_APPROVED_PROJECTS + realApproved;
  const deductedFromUploads = completedCountFromUploadBaseline(totalProjects);
  const approvedProjects = Math.min(
    totalProjects,
    Math.max(actualCompleted, deductedFromUploads),
  );

  return { totalProjects, approvedProjects };
}
