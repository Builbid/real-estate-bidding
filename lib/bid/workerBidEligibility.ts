import { isWorkerAccountRole, normalizeRole } from '@/lib/auth/roles';
import { getProjectServiceType, isFirmProject } from '@/lib/project/display';
import type { ServiceType } from '@/lib/types';

/**
 * Whether a logged-in worker can open the bidding flow for this project.
 *
 * Unified Worker Account: every Worker (Mistri, painter, plumber, electrician, ...)
 * may bid on every project category from one account. The only exception is the
 * separate turnkey Construction Firm line, which keeps its own package-based bidding.
 *
 * `_workerServiceType` is accepted for backwards compatibility with existing call
 * sites; a worker's legacy trade no longer limits what they can bid on.
 */
export function canWorkerBidOnProject(
  role: string | null | undefined,
  _workerServiceType: ServiceType | string | null | undefined,
  project: { service_type?: ServiceType | null },
): boolean {
  const normalizedRole = normalizeRole(role ?? undefined);
  const projectServiceType = getProjectServiceType(project);

  if (normalizedRole === 'construction_firm') {
    return projectServiceType === 'construction_firm';
  }

  if (isWorkerAccountRole(normalizedRole)) {
    return !isFirmProject(project);
  }

  return false;
}

export function getWorkerBidHref(
  role: string | null | undefined,
  projectId: string,
): string {
  const normalizedRole = normalizeRole(role ?? undefined);
  if (normalizedRole === 'construction_firm') {
    return `/dashboard/firm/bid/${projectId}`;
  }
  return `/dashboard/builder/bid/${projectId}`;
}

export function getWorkerProjectViewHref(projectId: string): string {
  return `/project/${projectId}`;
}
