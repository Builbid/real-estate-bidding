import { normalizeRole } from '@/lib/auth/roles';
import { getProjectServiceType } from '@/lib/project/display';
import type { ServiceType } from '@/lib/types';

/** Whether a logged-in worker can open the bidding flow for this project. */
export function canWorkerBidOnProject(
  role: string | null | undefined,
  workerServiceType: ServiceType | string | null | undefined,
  project: { service_type?: ServiceType | null },
): boolean {
  const normalizedRole = normalizeRole(role ?? undefined);
  const projectServiceType = getProjectServiceType(project);

  if (normalizedRole === 'service_provider') {
    return !!workerServiceType && workerServiceType === projectServiceType;
  }

  if (normalizedRole === 'labour_contractor') {
    return projectServiceType === 'labour_contractor';
  }

  if (normalizedRole === 'construction_firm') {
    return projectServiceType === 'construction_firm';
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
