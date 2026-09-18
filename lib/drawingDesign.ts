// ============================================================
// Drawing & Design service — package selection + building details
// ============================================================

import type { BuildingType } from './buildingConfig';
import { ASSAM_BUILDING_TYPE, RCC_BUILDING_TYPES } from './buildingConfig';
import {
  formatCustomFloorNumberInput,
  parseCustomFloorSequence,
} from './mistriDetails';
import {
  formatProjectStartTime,
  isProjectStartTimeType,
  type ProjectStartTimeType,
} from './projectStartTime';
import type { DrawingDesignType, ServiceType } from './types';

export type { ProjectStartTimeType };

export type DrawingDesignPackage =
  | '2d_floor_plan_only'
  | '3d_floor_plan'
  | '3d_front_elevation'
  | 'structural_drawings'
  | 'municipal_approval'
  /** Legacy options — no longer offered on new submissions. */
  | 'electrical_drawing'
  | 'plumbing_drawing'
  | 'full_architectural';

export type DrawingFloorPlan = 'G' | 'G+1' | 'G+2' | 'G+3' | 'G+4' | 'custom';

export type DrawingHouseStructure = 'assam' | 'rcc';

export const DRAWING_HOUSE_STRUCTURE_OPTIONS: {
  value: DrawingHouseStructure;
  label: string;
}[] = [
  { value: 'assam', label: 'Assam Type' },
  { value: 'rcc', label: 'RCC Structure' },
];

export type DrawingDeliverable =
  | 'pdf_soft_copy'
  | 'printed_blueprints'
  | '3d_rendering_images'
  | 'autocad_dwg_revit';

export type DrawingSubmissionTimeType =
  | '1week'
  | '2week'
  | '3week'
  | '4week'
  /** Legacy values — no longer offered on new submissions. */
  | '3days'
  | '1month';

export const DRAWING_SUBMISSION_TIME_OPTIONS: {
  value: DrawingSubmissionTimeType;
  label: string;
}[] = [
  { value: '1week', label: 'within 1 week' },
  { value: '2week', label: 'within 2 weeks' },
  { value: '3week', label: 'within 3 weeks' },
  { value: '4week', label: 'within 4 weeks' },
];

const LEGACY_SUBMISSION_TIME_LABELS: Record<'3days' | '1month', string> = {
  '3days': 'within 3 days',
  '1month': 'within one month',
};

const SUBMISSION_TIME_SET = new Set<DrawingSubmissionTimeType>([
  ...DRAWING_SUBMISSION_TIME_OPTIONS.map((o) => o.value),
  '3days',
  '1month',
]);

const ACTIVE_SUBMISSION_TIME_SET = new Set(
  DRAWING_SUBMISSION_TIME_OPTIONS.map((o) => o.value),
);

export function isDrawingSubmissionTimeType(
  value: unknown,
): value is DrawingSubmissionTimeType {
  return typeof value === 'string' && SUBMISSION_TIME_SET.has(value as DrawingSubmissionTimeType);
}

export function isActiveDrawingSubmissionTimeType(
  value: unknown,
): value is Exclude<DrawingSubmissionTimeType, '3days' | '1month'> {
  return (
    typeof value === 'string' &&
    ACTIVE_SUBMISSION_TIME_SET.has(value as Exclude<DrawingSubmissionTimeType, '3days' | '1month'>)
  );
}

export function formatDrawingSubmissionTime(type: DrawingSubmissionTimeType): string {
  return (
    DRAWING_SUBMISSION_TIME_OPTIONS.find((o) => o.value === type)?.label ??
    LEGACY_SUBMISSION_TIME_LABELS[type as '3days' | '1month'] ??
    type
  );
}

export interface DrawingDetails {
  /** Selected drawing packages (one or more). */
  packages: DrawingDesignPackage[];
  /** First selected package — kept for older stored records and readers. */
  package: DrawingDesignPackage;
  numberOfFloors: string;
  houseStructure?: DrawingHouseStructure | null;
  buildingTypes?: BuildingType[];
  customFloorNumber?: string | null;
  plotDimensions: string;
  /** Legacy field — no longer collected on new submissions. */
  plotAreaSqft?: number | null;
  deliverables: DrawingDeliverable[];
  /** Legacy field — no longer collected on new submissions. */
  projectAddress?: string | null;
  projectSubmissionTimeType?: DrawingSubmissionTimeType | null;
  /** Legacy start-time field from older drawing submissions. */
  projectStartTimeType?: ProjectStartTimeType | DrawingSubmissionTimeType;
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
    value: '3d_floor_plan',
    label: '3D Floor Plan',
    emoji: '🏠',
    description: '3D massing / walkthrough-style floor plan views',
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
    value: 'municipal_approval',
    label: 'Municipal / GMDA / Permission Approval Drawing',
    emoji: '📋',
    description: 'Drawings prepared for municipal, GMDA, or permission approval',
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
  '3d_floor_plan': ['3d_house_plan'],
  '3d_front_elevation': ['3d_front_elevation'],
  structural_drawings: ['structural_drawing'],
  electrical_drawing: ['electrical_layout'],
  plumbing_drawing: ['plumbing_layout'],
  full_architectural: ['2d_house_plan', '3d_house_plan', 'structural_drawing'],
  municipal_approval: ['2d_house_plan', 'structural_drawing'],
};

const SELECTABLE_PACKAGE_SET = new Set(DRAWING_PACKAGE_OPTIONS.map((o) => o.value));
const PACKAGE_SET = new Set<DrawingDesignPackage>([
  ...SELECTABLE_PACKAGE_SET,
  'electrical_drawing',
  'plumbing_drawing',
  'full_architectural',
]);
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

function parsePackages(raw: unknown): DrawingDesignPackage[] {
  if (!Array.isArray(raw)) return [];
  const next: DrawingDesignPackage[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && PACKAGE_SET.has(item as DrawingDesignPackage)) {
      const value = item as DrawingDesignPackage;
      if (!next.includes(value)) next.push(value);
    }
  }
  return next;
}

export function formatDrawingPackagesSummary(
  packages: DrawingDesignPackage[] | null | undefined,
): string {
  if (!packages?.length) return 'No packages selected';
  return packages
    .map((value) => optionLabel(DRAWING_PACKAGE_OPTIONS, value) || value)
    .join(', ');
}

export function drawingTypesFromPackages(
  packages: DrawingDesignPackage[],
): DrawingDesignType[] {
  const types: DrawingDesignType[] = [];
  for (const pkg of packages) {
    for (const type of DRAWING_PACKAGE_TO_TYPES[pkg] ?? []) {
      if (!types.includes(type)) types.push(type);
    }
  }
  return types;
}

export function normalizeDrawingFloorLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!trimmed) return null;
  if (trimmed === 'G' || trimmed === 'G+0' || trimmed === 'GROUND') return 'G';
  if (/^G\+\d+$/.test(trimmed)) return trimmed;
  return raw.trim();
}

export function resolveDrawingBuildingTypes(input: {
  houseStructure: DrawingHouseStructure | null;
  buildingTypes: BuildingType[];
}): BuildingType[] {
  if (input.houseStructure === 'assam') return [ASSAM_BUILDING_TYPE];
  return input.buildingTypes.filter((type) => RCC_BUILDING_TYPES.includes(type));
}

export function formatDrawingFloorSelection(input: {
  houseStructure: DrawingHouseStructure | null;
  buildingTypes: BuildingType[];
  customFloorSelected?: boolean;
  customFloorNumber?: string | null;
}): string {
  if (input.houseStructure === 'assam') return 'Assam Type';
  const parts = resolveDrawingBuildingTypes(input);
  const custom =
    input.customFloorSelected && input.customFloorNumber?.trim()
      ? `Floors above 4th (${input.customFloorNumber.trim()})`
      : null;
  return [...parts, custom].filter(Boolean).join(', ');
}

export function buildingTypesFromDrawingFloors(floors: string): BuildingType[] {
  const normalized = normalizeDrawingFloorLabel(floors) ?? 'G';
  if (/assam/i.test(normalized)) return [ASSAM_BUILDING_TYPE];
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
  let packages = parsePackages(v.packages);
  if (
    packages.length === 0 &&
    typeof v.package === 'string' &&
    PACKAGE_SET.has(v.package as DrawingDesignPackage)
  ) {
    packages = [v.package as DrawingDesignPackage];
  }
  if (packages.length === 0) return null;
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
  const submissionTime =
    (isDrawingSubmissionTimeType(v.projectSubmissionTimeType)
      ? v.projectSubmissionTimeType
      : null) ??
    (isDrawingSubmissionTimeType(v.projectStartTimeType) ? v.projectStartTimeType : null);
  const legacyStart = isProjectStartTimeType(v.projectStartTimeType)
    ? v.projectStartTimeType
    : null;
  if (!submissionTime && !legacyStart) return null;
  const specific =
    legacyStart === 'specific' &&
    typeof v.projectStartTimeSpecificDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.projectStartTimeSpecificDate)
      ? v.projectStartTimeSpecificDate
      : null;
  if (legacyStart === 'specific' && !specific) return null;
  const additional =
    typeof v.additionalRequirements === 'string' && v.additionalRequirements.trim()
      ? v.additionalRequirements.trim()
      : null;

  const houseStructure =
    v.houseStructure === 'assam' || v.houseStructure === 'rcc'
      ? v.houseStructure
      : /assam/i.test(floors)
        ? 'assam'
        : 'rcc';
  const buildingTypes = Array.isArray(v.buildingTypes)
    ? (v.buildingTypes.filter(
        (type): type is BuildingType =>
          typeof type === 'string' &&
          (type === ASSAM_BUILDING_TYPE || RCC_BUILDING_TYPES.includes(type as BuildingType)),
      ) as BuildingType[])
    : houseStructure === 'assam'
      ? [ASSAM_BUILDING_TYPE]
      : buildingTypesFromDrawingFloors(floors);
  const customFloorNumber =
    typeof v.customFloorNumber === 'string' && v.customFloorNumber.trim()
      ? v.customFloorNumber.trim()
      : null;

  return {
    packages,
    package: packages[0],
    numberOfFloors: floors,
    houseStructure,
    buildingTypes,
    customFloorNumber,
    plotDimensions: dimensions,
    plotAreaSqft: area,
    deliverables,
    projectAddress: address,
    projectSubmissionTimeType: submissionTime,
    projectStartTimeType: submissionTime ?? legacyStart ?? undefined,
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
    { label: 'Packages', value: formatDrawingPackagesSummary(details.packages) },
  );
  if (details.houseStructure) {
    blocks.push({
      label: 'Structure Type',
      value: details.houseStructure === 'assam' ? 'Assam Type' : 'RCC Structure',
    });
  }
  blocks.push(
    { label: 'Target Work Floor', value: details.numberOfFloors },
    { label: 'Approximate Plot Dimensions', value: details.plotDimensions },
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
    label: 'Project Submission Time',
    value: details.projectSubmissionTimeType
      ? formatDrawingSubmissionTime(details.projectSubmissionTimeType)
      : details.projectStartTimeType && isProjectStartTimeType(details.projectStartTimeType)
        ? formatProjectStartTime(
            details.projectStartTimeType,
            details.projectStartTimeSpecificDate,
          )
        : '—',
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
  packages: DrawingDesignPackage[];
  houseStructure: DrawingHouseStructure | null;
  buildingTypes: BuildingType[];
  customFloorSelected: boolean;
  customFloorNumber: string;
  plotDimensions: string;
  deliverables: DrawingDeliverable[];
  projectSubmissionTimeType: DrawingSubmissionTimeType | null;
  additionalRequirements: string;
}): { error: string } | { details: DrawingDetails } {
  const packages = parsePackages(input.packages).filter((value) =>
    SELECTABLE_PACKAGE_SET.has(value),
  );
  if (packages.length === 0) {
    return { error: 'Select at least one drawing package.' };
  }
  if (input.houseStructure !== 'assam' && input.houseStructure !== 'rcc') {
    return { error: 'Select Assam Type or RCC Structure.' };
  }
  if (input.houseStructure === 'rcc') {
    const namedFloors = resolveDrawingBuildingTypes({
      houseStructure: 'rcc',
      buildingTypes: input.buildingTypes,
    });
    if (namedFloors.length === 0 && !input.customFloorSelected) {
      return { error: 'Select at least one target work floor.' };
    }
    if (input.customFloorSelected) {
      const sequence = parseCustomFloorSequence(input.customFloorNumber, { allowGaps: true });
      if (!sequence) {
        return { error: 'Enter floor numbers above 4th (e.g., 5, 6, 7).' };
      }
    }
  }
  const buildingTypes = resolveDrawingBuildingTypes(input);
  const customFloorNumber =
    input.houseStructure === 'rcc' && input.customFloorSelected
      ? formatCustomFloorNumberInput(input.customFloorNumber)
      : null;
  const floors = formatDrawingFloorSelection({
    houseStructure: input.houseStructure,
    buildingTypes,
    customFloorSelected: input.houseStructure === 'rcc' && input.customFloorSelected,
    customFloorNumber,
  });
  if (!floors) {
    return { error: 'Select at least one target work floor.' };
  }
  const dimensions = input.plotDimensions.trim();
  if (dimensions.length < 2) {
    return { error: 'Enter approximate plot dimensions (e.g. 30ft x 40ft).' };
  }
  const deliverables = parseDeliverables(input.deliverables);
  if (deliverables.length === 0) {
    return { error: 'Select at least one deliverable.' };
  }
  if (!isActiveDrawingSubmissionTimeType(input.projectSubmissionTimeType)) {
    return { error: 'Select a project submission time.' };
  }

  return {
    details: {
      packages,
      package: packages[0],
      numberOfFloors: floors,
      houseStructure: input.houseStructure,
      buildingTypes,
      customFloorNumber,
      plotDimensions: dimensions,
      deliverables,
      projectSubmissionTimeType: input.projectSubmissionTimeType,
      projectStartTimeType: input.projectSubmissionTimeType,
      projectStartTimeSpecificDate: null,
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
