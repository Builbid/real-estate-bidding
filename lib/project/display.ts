import type { FinishingLevel, ServiceType } from '@/lib/types';
import { FINISHING_LEVEL_CONFIG, getFinishingClassBadge } from '@/lib/firm/finishingLevel';
import { formatBudgetRange } from '@/lib/formatIndianCurrency';
import { isDrawingDesignServiceType } from '@/lib/drawingDesign';
import {
  ALL_SERVICE_CATEGORIES,
  isTradeServiceType,
  type ServiceCategoryOption,
} from '@/lib/trades';

export function getProjectServiceType(project: { service_type?: ServiceType | null }): ServiceType {
  return project.service_type ?? 'labour_contractor';
}

export function isFirmProject(project: { service_type?: ServiceType | null }): boolean {
  return getProjectServiceType(project) === 'construction_firm';
}

export function isTradeProject(project: { service_type?: ServiceType | null }): boolean {
  return isTradeServiceType(getProjectServiceType(project));
}

/** Canonical service label + emoji (Mistri Contractor, Construction Firm, Painter, …). */
export function getServiceCategoryOption(serviceType: ServiceType): ServiceCategoryOption {
  return (
    ALL_SERVICE_CATEGORIES.find((c) => c.value === serviceType) ??
    ALL_SERVICE_CATEGORIES[0]
  );
}

export function getServiceCategoryLabel(serviceType: ServiceType): string {
  return getServiceCategoryOption(serviceType).label;
}

export function getServiceBadgeLabel(serviceType: ServiceType): string {
  const { label, emoji } = getServiceCategoryOption(serviceType);
  return `${label} ${emoji}`;
}

/** Tailwind text color classes for prominent service headings on auction cards. */
export function getServiceHeadingClass(serviceType: ServiceType): string {
  if (serviceType === 'construction_firm') {
    return 'text-violet-700 dark:text-violet-300';
  }
  if (isDrawingDesignServiceType(serviceType)) {
    return 'text-sky-700 dark:text-sky-300';
  }
  if (isTradeServiceType(serviceType)) {
    return 'text-teal-700 dark:text-teal-300';
  }
  return 'text-amber-800 dark:text-amber-300';
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
  if (!(level in FINISHING_LEVEL_CONFIG)) return null;
  return getFinishingClassBadge(level);
}
