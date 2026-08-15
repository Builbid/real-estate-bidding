import type { FinishingLevel, Project, ServiceType } from '@/lib/types';
import { FINISHING_LEVEL_CONFIG, getFinishingClassBadge } from '@/lib/firm/finishingLevel';
import { formatBudgetRange } from '@/lib/formatIndianCurrency';
import {
  DRAWING_PACKAGE_OPTIONS,
  formatDrawingTypesSummary,
  isDrawingDesignServiceType,
  parseDrawingDetails,
} from '@/lib/drawingDesign';
import {
  ALL_SERVICE_CATEGORIES,
  getProviderSpecialtyLabel,
  isTradeServiceType,
  type ServiceCategoryOption,
} from '@/lib/trades';
import { getConstructionLabel } from '@/lib/utils';

export function getProjectServiceType(project: { service_type?: ServiceType | null }): ServiceType {
  return project.service_type ?? 'labour_contractor';
}

export function isFirmProject(project: { service_type?: ServiceType | null }): boolean {
  return getProjectServiceType(project) === 'construction_firm';
}

export function isTradeProject(project: { service_type?: ServiceType | null }): boolean {
  return isTradeServiceType(getProjectServiceType(project));
}

/** Canonical service label + emoji (Mistri Worker, Construction Firm, Painter, …). */
export function getServiceCategoryOption(serviceType: ServiceType): ServiceCategoryOption {
  return (
    ALL_SERVICE_CATEGORIES.find((c) => c.value === serviceType) ??
    ALL_SERVICE_CATEGORIES[0]
  );
}

export function getServiceCategoryLabel(serviceType: ServiceType): string {
  return getServiceCategoryOption(serviceType).label;
}

/** Bidder-facing nouns + register link for public project CTAs (Mistri / Firm / trades). */
export function getServiceBidderLabels(serviceType: ServiceType): {
  singular: string;
  plural: string;
  registerHref: string;
} {
  if (serviceType === 'labour_contractor') {
    return {
      singular: 'Mistri Worker',
      plural: 'Mistri Workers',
      registerHref: '/register?role=labour_contractor',
    };
  }
  if (serviceType === 'construction_firm') {
    return {
      singular: 'Construction Firm',
      plural: 'Construction Firms',
      registerHref: '/register?role=construction_firm',
    };
  }
  if (isDrawingDesignServiceType(serviceType)) {
    return {
      singular: 'Drawing and Design provider',
      plural: 'Drawing and Design providers',
      registerHref: '/register?role=drawing_design',
    };
  }
  const label = getProviderSpecialtyLabel(serviceType);
  return {
    singular: label,
    plural: `${label}s`,
    registerHref: `/register?role=${serviceType}`,
  };
}

export function getServiceBadgeLabel(serviceType: ServiceType): string {
  const { label, emoji } = getServiceCategoryOption(serviceType);
  return `${label} ${emoji}`;
}

/** Primary service badge on dashboard auction cards (never track_type alone). */
export function getProjectServiceBadgeLabel(project: {
  service_type?: ServiceType | null;
}): string {
  const serviceType = getProjectServiceType(project);
  if (isDrawingDesignServiceType(serviceType) || isTradeServiceType(serviceType)) {
    return getProviderSpecialtyLabel(serviceType);
  }
  return getServiceCategoryLabel(serviceType);
}

/**
 * Meta line under project title on dashboard cards.
 * Drawing & Design → selected deliverables; otherwise construction config.
 */
export function getProjectConfigOrDrawingMeta(project: {
  service_type?: ServiceType | null;
  drawing_types?: string[] | null;
  drawing_details?: Project['drawing_details'];
  track_type?: Project['track_type'];
  sub_configuration?: Project['sub_configuration'];
}): string {
  if (isDrawingDesignServiceType(project.service_type)) {
    const details = parseDrawingDetails(project.drawing_details);
    if (details) {
      return (
        DRAWING_PACKAGE_OPTIONS.find((o) => o.value === details.package)?.label ??
        formatDrawingTypesSummary(project.drawing_types)
      );
    }
    return formatDrawingTypesSummary(project.drawing_types);
  }
  if (project.track_type && project.sub_configuration) {
    return getConstructionLabel(project.track_type, project.sub_configuration);
  }
  return getServiceCategoryLabel(getProjectServiceType(project));
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
