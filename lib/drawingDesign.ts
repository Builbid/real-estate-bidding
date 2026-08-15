// ============================================================
// Drawing & Design service — package selection + building details
// ============================================================

import type { BuildingType } from './buildingConfig';
import { RCC_BUILDING_TYPES } from './buildingConfig';
import {
  formatProjectStartTime,
  isProjectStartTimeType,
  validateProjectStartTime,
  type ProjectStartTimeType,
} from './projectStartTime';
import type { DrawingDesignType, ServiceType } from './types';

export type { ProjectStartTimeType };

export type DrawingDesignPackage =
  | '2d_floor_plan_only'
  | '3d_front_elevation'
  | 'structural_drawings'
  | 'electrical_drawing'
  | 'plumbing_drawing'
  | 'full_architectural'
  | 'municipal_approval';

export type DrawingFloorPlan = 'G' | 'G+1' | 'G+2' | 'G+3' | 'G+4' | 'custom';

export type DrawingDeliverable =
  | 'pdf_soft_copy'
  | 'printed_blueprints'
  | '3d_rendering_images'
  | 'autocad_dwg_revit';

export interface DrawingDetails {
  package: DrawingDesignPackage;
  numberOfFloors: string;
  plotDimensions: string;
  /** Legacy field — no longer collected on new submissions. */
  plotAreaSqft?: number | null;
  deliverables: DrawingDeliverable[];
  /** Legacy field — no longer collected on new submissions. */
  projectAddress?: string | null;
  projectStartTimeType: ProjectStartTimeType;
  projectStartTimeSpecificDate?: string | null;
  additionalRequirements?: string | null;
}

export const DRAWING_PACKAGE_OPTIONS: {
  value: DrawingDesignPackage;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    value: '2d_floor_plan_only',
    label: '2D Floor Plan Only',
    emoji: '📐',
    description: 'Dimensioned floor plans and room layout',
  },
  {
    value: '3d_front_elevation',
    label: '3D Front Elevation',
    emoji: '🖼️',
    description: 'Photorealistic front elevation visualization',
  },
  {
    value: 'structural_drawings',
    label: 'Structural Drawings (Beam/Column)',
    emoji: '🏗️',
    description: 'Column, beam, footing and slab drawings',
  },
  {
    value: 'electrical_drawing',
    label: 'Electrical Drawing',
    emoji: '⚡',
    description: 'Wiring, points, DB and switchboard layout',
  },
  {
    value: 'plumbing_drawing',
    label: 'Plumbing Drawing',
    emoji: '🔧',
    description: 'Water supply, drainage and sanitary layout',
  },
  {
    value: 'full_architectural',
    label: 'Full Architectural Package (2D + 3D + Structural)',
    emoji: '🏠',
    description: 'Complete 2D, 3D and structural drawing set',
  },
  {
    value: 'municipal_approval',
    label: 'Municipal / GMDA Approval Drawings',
    emoji: '📋',
    description: 'Drawings prepared for municipal / GMDA approval',
  },
];

export const DRAWING_FLOOR_OPTIONS: { value: DrawingFloorPlan; label: string }[] = [
  { value: 'G', label: 'G (Ground only)' },
  { value: 'G+1', label: 'G+1' },
  { value: 'G+2', label: 'G+2' },
  { value: 'G+3', label: 'G+3' },
  { value: 'G+4', label: 'G+4' },
  { value: 'custom', label: 'Custom (e.g. G+5)' },
];

export const DRAWING_DELIVERABLE_OPTIONS: { value: DrawingDeliverable; label: string }[] = [
  { value: 'pdf_soft_copy', label: 'PDF Soft Copy' },
  { value: 'printed_blueprints', label: 'Printed Blueprints' },
  { value: '3d_rendering_images', label: '3D Rendering Images' },
  { value: 'autocad_dwg_revit', label: 'AutoCAD DWG / Revit File (for organization purpose)' },
];

export const DRAWING_PACKAGE_TO_TYPES: Record<DrawingDesignPackage, DrawingDesignType[]> = {
  '2d_floor_plan_only': ['2d_house_plan'],
  '3d_front_elevation': ['3d_front_elevation'],
  structural_drawings: ['structural_drawing'],
  electrical_drawing: ['electrical_layout'],
  plumbing_drawing: ['plumbing_layout'],
  full_architectural: ['2d_house_plan', '3d_house_plan', 'structural_drawing'],
  municipal_approval: ['2d_house_plan', 'structural_drawing'],
};

const PACKAGE_SET = new Set(DRAWING_PACKAGE_OPTIONS.map((o) => o.value));
const DELIVERABLE_SET = new Set(DRAWING_DELIVERABLE_OPTIONS.map((o) => o.value));
const FLOOR_PRESET_SET = new Set(
  DRAWING_FLOOR_OPTIONS.filter((o) => o.value !== 'custom').map((o) => o.value),
);

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function parsePositiveNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/,/g, '').trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseDeliverables(raw: unknown): DrawingDeliverable[] {
  if (!Array.isArray(raw)) return [];
  const next: DrawingDeliverable[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && DELIVERABLE_SET.has(item as DrawingDeliverable)) {
      const value = item as DrawingDeliverable;
      if (!next.includes(value)) next.push(value);
    }
  }
  return next;
}

export function normalizeDrawingFloorLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!trimmed) return null;
  if (trimmed === 'G' || trimmed === 'G+0' || trimmed === 'GROUND') return 'G';
  if (/^G\+\d+$/.test(trimmed)) return trimmed;
  return raw.trim();
}

export function buildingTypesFromDrawingFloors(floors: string): BuildingType[] {
  const normalized = normalizeDrawingFloorLabel(floors) ?? 'G';
  if (normalized === 'G') return [RCC_BUILDING_TYPES[0]];
  const match = normalized.match(/^G\+(\d+)$/);
  if (!match) return [RCC_BUILDING_TYPES[0]];
  const upper = Math.min(parseInt(match[1], 10), RCC_BUILDING_TYPES.length - 1);
  return RCC_BUILDING_TYPES.slice(0, upper + 1);
}

export function isDrawingDetails(value: unknown): value is DrawingDetails {
  return parseDrawingDetails(value) != null;
}

export function parseDrawingDetails(value: unknown): DrawingDetails | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.package !== 'string' || !PACKAGE_SET.has(v.package as DrawingDesignPackage)) {
    return null;
  }
  const floors = normalizeDrawingFloorLabel(v.numberOfFloors);
  const dimensions = typeof v.plotDimensions === 'string' ? v.plotDimensions.trim() : '';
  const area = parsePositiveNumber(v.plotAreaSqft);
  const address =
    typeof v.projectAddress === 'string' && v.projectAddress.trim().length >= 4
      ? v.projectAddress.trim()
      : null;
  const deliverables = parseDeliverables(v.deliverables);
  if (!floors || dimensions.length < 2 || deliverables.length === 0) {
    return null;
  }
  if (!isProjectStartTimeType(v.projectStartTimeType)) return null;
  const specific =
    v.projectStartTimeType === 'specific' &&
    typeof v.projectStartTimeSpecificDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.projectStartTimeSpecificDate)
      ? v.projectStartTimeSpecificDate
      : null;
  if (v.projectStartTimeType === 'specific' && !specific) return null;
  const additional =
    typeof v.additionalRequirements === 'string' && v.additionalRequirements.trim()
      ? v.additionalRequirements.trim()
      : null;

  return {
    package: v.package as DrawingDesignPackage,
    numberOfFloors: floors,
    plotDimensions: dimensions,
    plotAreaSqft: area,
    deliverables,
    projectAddress: address,
    projectStartTimeType: v.projectStartTimeType,
    projectStartTimeSpecificDate: specific,
    additionalRequirements: additional,
  };
}

export function getDrawingWorkRequirementBlocks(details: DrawingDetails): {
  label: string;
  value: string;
}[] {
  const blocks: { label: string; value: string }[] = [];
  if (details.projectAddress) {
    blocks.push({ label: 'Project Address', value: details.projectAddress });
  }
  blocks.push(
    { label: 'Package', value: optionLabel(DRAWING_PACKAGE_OPTIONS, details.package) },
    { label: 'Number of Floors', value: details.numberOfFloors },
    { label: 'Plot Dimensions', value: details.plotDimensions },
  );
  if (details.plotAreaSqft != null) {
    blocks.push({
      label: 'Total Plot Area',
      value: `${details.plotAreaSqft.toLocaleString('en-IN')} Sq. Ft.`,
    });
  }
  blocks.push({
    label: 'Deliverables',
    value: details.deliverables
      .map((d) => optionLabel(DRAWING_DELIVERABLE_OPTIONS, d))
      .join(', '),
  });
  blocks.push({
    label: 'Start Time',
    value: formatProjectStartTime(
      details.projectStartTimeType,
      details.projectStartTimeSpecificDate,
    ),
  });
  if (details.additionalRequirements) {
    blocks.push({
      label: 'Additional Requirements',
      value: details.additionalRequirements,
    });
  }
  return blocks;
}

export function validateDrawingDetailsInput(input: {
  package: DrawingDesignPackage | null;
  floorOption: DrawingFloorPlan | null;
  customFloors: string;
  plotDimensions: string;
  deliverables: DrawingDeliverable[];
  projectStartTimeType: ProjectStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
}): { error: string } | { details: DrawingDetails } {
  if (!input.package || !PACKAGE_SET.has(input.package)) {
    return { error: 'Select a drawing package.' };
  }
  if (!input.floorOption) {
    return { error: 'Select the number of floors.' };
  }
  const floors =
    input.floorOption === 'custom'
      ? normalizeDrawingFloorLabel(input.customFloors)
      : input.floorOption;
  if (!floors) {
    return { error: 'Enter the number of floors (e.g. G+2).' };
  }
  const dimensions = input.plotDimensions.trim();
  if (dimensions.length < 2) {
    return { error: 'Enter plot dimensions (e.g. 30ft x 40ft).' };
  }
  const deliverables = parseDeliverables(input.deliverables);
  if (deliverables.length === 0) {
    return { error: 'Select at least one deliverable.' };
  }
  const start = validateProjectStartTime({
    projectStartTimeType: input.projectStartTimeType,
    projectStartTimeSpecificDate: input.projectStartTimeSpecificDate,
  });
  if ('error' in start) return start;

  return {
    details: {
      package: input.package,
      numberOfFloors: floors,
      plotDimensions: dimensions,
      deliverables,
      projectStartTimeType: start.type,
      projectStartTimeSpecificDate: start.specificDate,
      additionalRequirements: input.additionalRequirements.trim() || null,
    },
  };
}

export interface DrawingTypeOption {
  value: DrawingDesignType;
  label: string;
  emoji: string;
  description: string;
}

export const DRAWING_TYPE_OPTIONS: DrawingTypeOption[] = [
  {
    value: '2d_house_plan',
    label: '2D House Plan',
    emoji: '📐',
    description: 'Floor plans, dimensions & room layout',
  },
  {
    value: '3d_house_plan',
    label: '3D House Plan',
    emoji: '🏠',
    description: '3D massing / walkthrough-style plan views',
  },
  {
    value: 'structural_drawing',
    label: 'Structural Drawing',
    emoji: '🏗️',
    description: 'Column, beam, footing & slab structural drawings',
  },
  {
    value: 'electrical_layout',
    label: 'Electrical Drawing Layout',
    emoji: '⚡',
    description: 'Wiring, points, DB & switchboard layout',
  },
  {
    value: 'plumbing_layout',
    label: 'Plumbing Layout',
    emoji: '🔧',
    description: 'Water supply, drainage & sanitary layout',
  },
  {
    value: '3d_front_elevation',
    label: '3D Realistic Front Elevation',
    emoji: '🖼️',
    description: 'Photorealistic front elevation visualization',
  },
];

export const DRAWING_TYPE_VALUES: DrawingDesignType[] = DRAWING_TYPE_OPTIONS.map((o) => o.value);

export const DRAWING_DESIGN_SERVICE: ServiceType = 'drawing_design';

export function isDrawingDesignServiceType(
  value: string | null | undefined,
): value is 'drawing_design' {
  return value === 'drawing_design';
}

export function isDrawingDesignType(value: string | null | undefined): value is DrawingDesignType {
  if (!value) return false;
  return (DRAWING_TYPE_VALUES as string[]).includes(value);
}

export function getDrawingTypeOption(value: string | null | undefined): DrawingTypeOption | undefined {
  return DRAWING_TYPE_OPTIONS.find((o) => o.value === value);
}

export function getDrawingTypeLabel(value: string | null | undefined): string {
  return getDrawingTypeOption(value)?.label ?? value ?? 'Drawing';
}

export function formatDrawingTypesSummary(types: string[] | null | undefined): string {
  if (!types?.length) return 'No drawings selected';
  return types.map((t) => getDrawingTypeLabel(t)).join(' · ');
}
