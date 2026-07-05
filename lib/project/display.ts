import type { FinishingLevel, ServiceType } from '@/lib/types';
import { getFinishingClassBadge } from '@/lib/firm/finishingLevel';
import { formatBudgetRange } from '@/lib/formatIndianCurrency';

export function getProjectServiceType(project: { service_type?: ServiceType | null }): ServiceType {
  return project.service_type ?? 'labour_contractor';
}

export function isFirmProject(project: { service_type?: ServiceType | null }): boolean {
  return getProjectServiceType(project) === 'construction_firm';
}

export function getServiceBadgeLabel(serviceType: ServiceType): string {
  return serviceType === 'construction_firm' ? 'With Material 🏗️' : 'Labour Only 👷';
}

export function getProjectFloorAreaDisplay(project: {
  service_type?: ServiceType | null;
  floor_area_sqft?: number | null;
  plot_area_sqft?: number | null;
}): string | null {
  if (isFirmProject(project)) {
    if (project.floor_area_sqft) return `~${project.floor_area_sqft.toLocaleString('en-IN')} sqft`;
    return null;
  }
  if (project.plot_area_sqft) return `${project.plot_area_sqft.toLocaleString('en-IN')} sqft`;
  return null;
}

export function getProjectBudgetDisplay(project: {
  budget_range_min?: number | null;
  budget_range_max?: number | null;
}): string | null {
  return formatBudgetRange(project.budget_range_min ?? null, project.budget_range_max ?? null);
}

export function getFinishingBadge(level: FinishingLevel | null | undefined): string | null {
  if (!level) return null;
  return getFinishingClassBadge(level);
}
