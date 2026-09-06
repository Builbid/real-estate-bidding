import {
  isAssamMistriFloor,
  mistriFloorUpperCount,
  parseMistriDetails,
  rccScopeFromWorkTypes,
  sortMistriFloorWork,
  type MistriFloorWork,
  type MistriFlooringMaterial,
  MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS,
  MISTRI_FLOORING_MATERIAL_OPTIONS,
} from '@/lib/mistriDetails';
import {
  getConstructionDisplayShortLabel,
  hasNewBuildingConfig,
  sortBuildingTypes,
  type BuildingType,
  type ConstructionTypesMap,
} from '@/lib/buildingConfig';
import { getProjectServiceType } from '@/lib/project/display';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import { TRACK_LABELS } from '@/lib/utils';
import type { Project, ServiceType, TrackType } from '@/lib/types';
import { formatMatrixSummary, getProjectFloorStages } from '@/lib/constructionMatrix';

export type FloorSummaryItem = {
  key: string;
  /** Compact floor code for badges, e.g. G, 1F, 2F, Assam. */
  floorCode: string;
  /** Concise scope using exact trade terms. */
  scope: string;
  /** Combined badge text, e.g. "G: Full Construction + Tiles". */
  label: string;
};

function flooringMaterialShort(
  material: MistriFlooringMaterial | null | undefined,
  isAssam: boolean,
): string | null {
  if (!material) return null;
  const options = isAssam
    ? MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS
    : MISTRI_FLOORING_MATERIAL_OPTIONS;
  return options.find((o) => o.value === material)?.label ?? null;
}

/** Short floor code for card badges (G / 1F / 2F / Assam). */
export function formatFloorCode(
  floor: Pick<MistriFloorWork, 'floorId' | 'customFloorNumber'>,
): string {
  if (isAssamMistriFloor(floor.floorId)) return 'Assam';
  const upper = mistriFloorUpperCount(floor.floorId, floor.customFloorNumber);
  if (upper <= 0) return 'G';
  return `${upper}F`;
}

/**
 * Concise floor scope for cards — keeps trade titles, strips long parentheses.
 * Examples: "Full Construction + Tiles", "Frame / Slab Casting Only".
 */
export function formatFloorScopeShort(fw: MistriFloorWork): string {
  const isAssam = isAssamMistriFloor(fw.floorId);
  const scope = rccScopeFromWorkTypes(fw.workTypes, fw.scopeOption);
  const flooringLabel = flooringMaterialShort(fw.flooringMaterial, isAssam);

  if (isAssam) {
    let base = 'Full finishing upto Plastering and Roof work';
    if (fw.includeFineFlooring) {
      return flooringLabel ? `${base} + ${flooringLabel}` : `${base} + Flooring`;
    }
    if (fw.workTypes.includes('flooring')) {
      return flooringLabel ? `Flooring (${flooringLabel})` : 'Flooring';
    }
    return base;
  }

  if (scope === 'full_construction' || fw.workTypes.includes('full_finished')) {
    let label = 'Full Construction';
    if (fw.includeFineFlooring) {
      label = flooringLabel
        ? `Full Construction + ${flooringLabel}`
        : 'Full Construction + Flooring';
    }
    return label;
  }

  if (scope === 'frame_only' || fw.workTypes.includes('frame_skeleton')) {
    return 'Frame / Slab Casting Only';
  }

  if (scope === 'wall_plaster_only') {
    return 'Wall Construction & Plastering Only';
  }

  const parts: string[] = [];
  if (fw.workTypes.includes('brick_aac')) parts.push('Brick / AAC Wall');
  if (fw.workTypes.includes('plastering')) parts.push('Plastering');
  if (fw.workTypes.includes('flooring')) {
    parts.push(flooringLabel ? `Flooring (${flooringLabel})` : 'Flooring');
  }
  if (parts.length > 0) return parts.join(' + ');

  return 'Scope TBD';
}

function fromMistriFloorWork(floorWork: readonly MistriFloorWork[]): FloorSummaryItem[] {
  return sortMistriFloorWork(floorWork).map((fw) => {
    const floorCode = formatFloorCode(fw);
    const scope = formatFloorScopeShort(fw);
    return {
      key: `${fw.floorId}:${fw.customFloorNumber ?? ''}`,
      floorCode,
      scope,
      label: `${floorCode}: ${scope}`,
    };
  });
}

function fromBuildingConstructionTypes(project: {
  building_types?: BuildingType[] | null;
  construction_types?: ConstructionTypesMap | null;
}): FloorSummaryItem[] {
  if (!hasNewBuildingConfig(project)) return [];
  const types = sortBuildingTypes(
    (project.building_types ?? []).filter((t): t is BuildingType => typeof t === 'string'),
  );
  const constructionTypes = (project.construction_types ?? {}) as ConstructionTypesMap;

  return types.map((type) => {
    const ct = constructionTypes[type];
    let floorCode = 'G';
    if (type === 'Assam Type') floorCode = 'Assam';
    else if (type === 'RCC Ground Floor') floorCode = 'G';
    else {
      const m = type.match(/RCC\s+(\d+)/i);
      floorCode = m ? `${m[1]}F` : type.replace(/^RCC\s+/i, '');
    }
    const scope = ct
      ? getConstructionDisplayShortLabel(ct)
          .replace('Full Finished Structure', 'Full Construction')
          .replace('Frame (Skeleton) only', 'Frame / Slab Casting Only')
      : 'Scope TBD';
    return {
      key: type,
      floorCode,
      scope,
      label: `${floorCode}: ${scope}`,
    };
  });
}

function fromLegacyMatrix(project: {
  track_type?: TrackType | null;
  sub_configuration?: Project['sub_configuration'];
}): FloorSummaryItem[] {
  if (!project.track_type || !project.sub_configuration) return [];
  const floors = getProjectFloorStages(project.track_type, project.sub_configuration);
  if (floors.length === 0) return [];

  return floors.map((f) => {
    const floorCode =
      f.floor === 'ground' ? 'G' : f.floor === 'first' ? '1F' : f.floor === 'second' ? '2F' : f.floor;
    const scope =
      f.stage === 'full' ? 'Full Construction' : 'Frame / Slab Casting Only';
    return {
      key: f.floor,
      floorCode,
      scope,
      label: `${floorCode}: ${scope}`,
    };
  });
}

type FloorSummaryProject = {
  service_type?: ServiceType | null;
  track_type?: TrackType | null;
  sub_configuration?: Project['sub_configuration'];
  building_types?: BuildingType[] | null;
  construction_types?: ConstructionTypesMap | null;
  mistri_details?: Project['mistri_details'];
};

/**
 * Standardized concise floor-scope labels for dashboard / public feed cards.
 * Prefers live `mistri_details.floorWork` over legacy matrix summary fields.
 */
export function formatFloorSummary(project: FloorSummaryProject): FloorSummaryItem[] {
  const serviceType = getProjectServiceType(project);
  if (serviceType === 'labour_contractor') {
    const details = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
    if (details?.floorWork && details.floorWork.length > 0) {
      return fromMistriFloorWork(details.floorWork);
    }
  }

  const fromBuilding = fromBuildingConstructionTypes(project);
  if (fromBuilding.length > 0) return fromBuilding;

  if (serviceType === 'labour_contractor' || serviceType === 'construction_firm') {
    return fromLegacyMatrix(project);
  }

  return [];
}

/** Single-line join for places that still need a string (no · run-on preferred — use badges). */
export function formatFloorSummaryText(project: FloorSummaryProject): string | null {
  const items = formatFloorSummary(project);
  if (items.length === 0) return null;
  return items.map((i) => i.label).join(' · ');
}

export function getProjectLocationLabel(project: {
  district?: string | null;
  state?: string | null;
}): string {
  return [project.district, project.state].filter(Boolean).join(', ');
}

export function getProjectBuiltUpAreaLabel(project: {
  service_type?: ServiceType | null;
  plot_area_sqft?: number | null;
  floor_area_sqft?: number | null;
  mistri_details?: Project['mistri_details'];
}): string | null {
  if (getProjectServiceType(project) === 'labour_contractor') {
    const details = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
    if (details?.approximateAreaSqft && details.approximateAreaSqft > 0) {
      return `${details.approximateAreaSqft.toLocaleString('en-IN')} sqft`;
    }
  }
  if (project.floor_area_sqft && project.floor_area_sqft > 0) {
    return `~${project.floor_area_sqft.toLocaleString('en-IN')} sqft`;
  }
  if (project.plot_area_sqft && project.plot_area_sqft > 0) {
    return `${project.plot_area_sqft.toLocaleString('en-IN')} sqft`;
  }
  return null;
}

export function getProjectBuildingTypeLabel(project: {
  track_type?: TrackType | null;
}): string | null {
  if (!project.track_type) return null;
  return TRACK_LABELS[project.track_type] ?? project.track_type;
}

/** True when a work-requirement label is a per-floor scope row (shown as badges instead). */
export function isFloorScopeRequirementLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    trimmed.startsWith('RCC ') ||
    trimmed.startsWith('Assam Type') ||
    /^Custom Floor/i.test(trimmed) ||
    /^\d+(st|nd|rd|th) Floor$/i.test(trimmed)
  );
}

/** @deprecated Prefer formatFloorSummary badges — kept for one-off text needs. */
export function legacyMatrixFloorSummaryText(project: {
  track_type?: TrackType | null;
  sub_configuration?: Project['sub_configuration'];
}): string | null {
  if (!project.track_type || !project.sub_configuration) return null;
  const floors = getProjectFloorStages(project.track_type, project.sub_configuration);
  if (floors.length === 0) return null;
  return formatMatrixSummary(floors);
}
