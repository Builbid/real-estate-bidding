// ============================================================
// Trade work requirements — plumber, electrician, carpenter,
// interior (false_ceiling_work), earthwork.
// Stored as projects.trade_details
// ============================================================

import type { TradeServiceType } from './types';
import {
  formatProjectStartTime,
  isProjectStartTimeType,
  validateProjectStartTime,
  type ProjectStartTimeType,
} from './projectStartTime';

export type { ProjectStartTimeType };

export type TradeWorkService =
  | 'plumber'
  | 'electrician'
  | 'carpenter'
  | 'false_ceiling_work'
  | 'earthwork';

export function isCustomTradeWorkService(
  value: string | null | undefined,
): value is TradeWorkService {
  return (
    value === 'plumber' ||
    value === 'electrician' ||
    value === 'carpenter' ||
    value === 'false_ceiling_work' ||
    value === 'earthwork'
  );
}

// ─── Option types ───────────────────────────────────────────

export type PlumberScopeType =
  | 'full_house'
  | 'bathroom_renovation'
  | 'tank_pipe_fitting'
  | 'repair_leakage';

export type PlumberMaterialScope = 'labour_only' | 'labour_plus_pipes';

export type ElectricianScopeType =
  | 'full_house_wiring'
  | 'db_mcb'
  | 'switchboard_lights'
  | 'earthing'
  | 'repair_alteration';

export type ElectricianPointEstimate = 'under_20' | '20_50' | '50_100' | '100_plus';

export type ElectricianHeavyAppliance =
  | 'ac_wiring'
  | 'geyser_points'
  | 'inverter_wiring'
  | 'three_phase';

export type ElectricianMaterialScope = 'labour_only' | 'labour_plus_wire';

export type CarpenterScopeType =
  | 'door_window_frames'
  | 'modular_kitchen'
  | 'wardrobes'
  | 'roof_shuttering'
  | 'furniture';

export type CarpenterWoodType = 'teak_sal' | 'plywood_laminate' | 'mdf_particle';

export type InteriorScopeType =
  | 'false_ceiling'
  | 'tv_wall_panelling'
  | 'full_home_interior'
  | 'painting_wallpaper';

export type InteriorTargetSpace = 'living_room' | 'bedrooms' | 'kitchen' | 'full_house';

export type EarthworkType =
  | 'site_clearing'
  | 'foundation_excavation'
  | 'pond_digging'
  | 'soil_filling';

export type EarthworkMachine =
  | 'jcb_excavator'
  | 'tractor_dumper'
  | 'manual_labour';

// ─── Stored payloads ────────────────────────────────────────

interface TradeDetailsBase {
  projectAddress: string;
  projectStartTimeType: ProjectStartTimeType;
  projectStartTimeSpecificDate?: string | null;
  additionalRequirements?: string | null;
}

export interface PlumberDetails extends TradeDetailsBase {
  service: 'plumber';
  scopeType: PlumberScopeType;
  bathrooms: number;
  kitchens: number;
  overheadTank: boolean;
  concealedPiping: boolean;
  materialScope: PlumberMaterialScope;
}

export interface ElectricianDetails extends TradeDetailsBase {
  service: 'electrician';
  scopeType: ElectricianScopeType;
  pointEstimate: ElectricianPointEstimate;
  heavyAppliances: ElectricianHeavyAppliance[];
  materialScope: ElectricianMaterialScope;
}

export interface CarpenterDetails extends TradeDetailsBase {
  service: 'carpenter';
  scopeType: CarpenterScopeType;
  woodType: CarpenterWoodType;
  approxAreaSqft?: number | null;
  doorWindowCount?: number | null;
}

export interface InteriorDetails extends TradeDetailsBase {
  service: 'false_ceiling_work';
  scopeType: InteriorScopeType;
  targetSpaces: InteriorTargetSpace[];
  interiorAreaSqft: number;
}

export interface EarthworkDetails extends TradeDetailsBase {
  service: 'earthwork';
  workType: EarthworkType;
  machineRequirement: EarthworkMachine;
  estimatedDepthFt: number;
  approxVolume: string;
}

export type TradeDetails =
  | PlumberDetails
  | ElectricianDetails
  | CarpenterDetails
  | InteriorDetails
  | EarthworkDetails;

// ─── Option catalogs ────────────────────────────────────────

export const PLUMBER_SCOPE_OPTIONS: { value: PlumberScopeType; label: string }[] = [
  { value: 'full_house', label: 'Full House Plumbing (New Construction)' },
  { value: 'bathroom_renovation', label: 'Bathroom Renovation' },
  { value: 'tank_pipe_fitting', label: 'Water Tank / Pipe Fitting' },
  { value: 'repair_leakage', label: 'Repair / Leakage Work' },
];

export const PLUMBER_MATERIAL_OPTIONS: { value: PlumberMaterialScope; label: string }[] = [
  { value: 'labour_only', label: 'Labour Only (Client provides materials)' },
  { value: 'labour_plus_pipes', label: 'Labour + Pipes & Fittings' },
];

export const ELECTRICIAN_SCOPE_OPTIONS: { value: ElectricianScopeType; label: string }[] = [
  { value: 'full_house_wiring', label: 'Full House Wiring (New Construction)' },
  { value: 'db_mcb', label: 'DB Box & MCB Setup' },
  { value: 'switchboard_lights', label: 'Switchboard & Light Fitting' },
  { value: 'earthing', label: 'Earthing Installation' },
  { value: 'repair_alteration', label: 'Repair / Alteration' },
];

export const ELECTRICIAN_POINT_OPTIONS: { value: ElectricianPointEstimate; label: string }[] = [
  { value: 'under_20', label: '< 20 Points' },
  { value: '20_50', label: '20-50 Points' },
  { value: '50_100', label: '50-100 Points' },
  { value: '100_plus', label: '100+ Points' },
];

export const ELECTRICIAN_APPLIANCE_OPTIONS: {
  value: ElectricianHeavyAppliance;
  label: string;
}[] = [
  { value: 'ac_wiring', label: 'AC Wiring' },
  { value: 'geyser_points', label: 'Geyser Points' },
  { value: 'inverter_wiring', label: 'Inverter Wiring' },
  { value: 'three_phase', label: '3-Phase Connection' },
];

export const ELECTRICIAN_MATERIAL_OPTIONS: {
  value: ElectricianMaterialScope;
  label: string;
}[] = [
  { value: 'labour_only', label: 'Labour Only' },
  { value: 'labour_plus_wire', label: 'Labour + Wire/Conduits' },
];

export const CARPENTER_SCOPE_OPTIONS: { value: CarpenterScopeType; label: string }[] = [
  { value: 'door_window_frames', label: 'Door & Window Frames (Chowkhat)' },
  { value: 'modular_kitchen', label: 'Modular Kitchen' },
  { value: 'wardrobes', label: 'Wardrobes & Cupboards' },
  { value: 'roof_shuttering', label: 'Roof Shuttering (Concrete Formwork)' },
  { value: 'furniture', label: 'Furniture Work' },
];

export const CARPENTER_WOOD_OPTIONS: { value: CarpenterWoodType; label: string }[] = [
  { value: 'teak_sal', label: 'Teak / Sal Wood' },
  { value: 'plywood_laminate', label: 'Plywood & Laminate' },
  { value: 'mdf_particle', label: 'MDF / Particle Board' },
];

export const INTERIOR_SCOPE_OPTIONS: { value: InteriorScopeType; label: string }[] = [
  { value: 'false_ceiling', label: 'False Ceiling (Gypsum/POP)' },
  { value: 'tv_wall_panelling', label: 'TV Unit & Wall Panelling' },
  { value: 'full_home_interior', label: 'Full Home Interior Design & Execution' },
  { value: 'painting_wallpaper', label: 'Painting & Wallpaper accent' },
];

export const INTERIOR_SPACE_OPTIONS: { value: InteriorTargetSpace; label: string }[] = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedrooms', label: 'Bedrooms' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'full_house', label: 'Full House' },
];

export const EARTHWORK_TYPE_OPTIONS: { value: EarthworkType; label: string }[] = [
  { value: 'site_clearing', label: 'Site Clearing & Levelling' },
  { value: 'foundation_excavation', label: 'Foundation Excavation' },
  { value: 'pond_digging', label: 'Pond / Water Body Digging' },
  { value: 'soil_filling', label: 'Soil Filling / Backfilling' },
];

export const EARTHWORK_MACHINE_OPTIONS: { value: EarthworkMachine; label: string }[] = [
  { value: 'jcb_excavator', label: 'JCB / Excavator Required' },
  { value: 'tractor_dumper', label: 'Tractor / Dumper Required' },
  { value: 'manual_labour', label: 'Manual Labour Only' },
];

const PLUMBER_SCOPE_SET = new Set(PLUMBER_SCOPE_OPTIONS.map((o) => o.value));
const PLUMBER_MATERIAL_SET = new Set(PLUMBER_MATERIAL_OPTIONS.map((o) => o.value));
const ELECTRICIAN_SCOPE_SET = new Set(ELECTRICIAN_SCOPE_OPTIONS.map((o) => o.value));
const ELECTRICIAN_POINT_SET = new Set(ELECTRICIAN_POINT_OPTIONS.map((o) => o.value));
const ELECTRICIAN_APPLIANCE_SET = new Set(ELECTRICIAN_APPLIANCE_OPTIONS.map((o) => o.value));
const ELECTRICIAN_MATERIAL_SET = new Set(ELECTRICIAN_MATERIAL_OPTIONS.map((o) => o.value));
const CARPENTER_SCOPE_SET = new Set(CARPENTER_SCOPE_OPTIONS.map((o) => o.value));
const CARPENTER_WOOD_SET = new Set(CARPENTER_WOOD_OPTIONS.map((o) => o.value));
const INTERIOR_SCOPE_SET = new Set(INTERIOR_SCOPE_OPTIONS.map((o) => o.value));
const INTERIOR_SPACE_SET = new Set(INTERIOR_SPACE_OPTIONS.map((o) => o.value));
const EARTHWORK_TYPE_SET = new Set(EARTHWORK_TYPE_OPTIONS.map((o) => o.value));
const EARTHWORK_MACHINE_SET = new Set(EARTHWORK_MACHINE_OPTIONS.map((o) => o.value));

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

function parseCount(raw: unknown, min: number, max: number): number | null {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? parseInt(raw.replace(/,/g, '').trim(), 10)
        : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function normalizeAddress(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length >= 4 ? trimmed : null;
}

function normalizeAdditional(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function parseStartFields(v: Record<string, unknown>): {
  projectStartTimeType: ProjectStartTimeType;
  projectStartTimeSpecificDate: string | null;
} | null {
  if (!isProjectStartTimeType(v.projectStartTimeType)) return null;
  const specific =
    v.projectStartTimeType === 'specific' &&
    typeof v.projectStartTimeSpecificDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.projectStartTimeSpecificDate)
      ? v.projectStartTimeSpecificDate
      : null;
  if (v.projectStartTimeType === 'specific' && !specific) return null;
  return {
    projectStartTimeType: v.projectStartTimeType,
    projectStartTimeSpecificDate: specific,
  };
}

function parseAppliances(raw: unknown): ElectricianHeavyAppliance[] {
  if (!Array.isArray(raw)) return [];
  const next: ElectricianHeavyAppliance[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && ELECTRICIAN_APPLIANCE_SET.has(item as ElectricianHeavyAppliance)) {
      const value = item as ElectricianHeavyAppliance;
      if (!next.includes(value)) next.push(value);
    }
  }
  return next;
}

function parseSpaces(raw: unknown): InteriorTargetSpace[] {
  if (!Array.isArray(raw)) return [];
  const next: InteriorTargetSpace[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && INTERIOR_SPACE_SET.has(item as InteriorTargetSpace)) {
      const value = item as InteriorTargetSpace;
      if (!next.includes(value)) next.push(value);
    }
  }
  return next;
}

export function isTradeDetails(value: unknown): value is TradeDetails {
  return parseTradeDetails(value) != null;
}

export function parseTradeDetails(value: unknown): TradeDetails | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const address = normalizeAddress(v.projectAddress);
  const start = parseStartFields(v);
  if (!address || !start) return null;
  const additional = normalizeAdditional(v.additionalRequirements);

  if (v.service === 'plumber') {
    if (
      typeof v.scopeType !== 'string' ||
      !PLUMBER_SCOPE_SET.has(v.scopeType as PlumberScopeType) ||
      typeof v.materialScope !== 'string' ||
      !PLUMBER_MATERIAL_SET.has(v.materialScope as PlumberMaterialScope) ||
      typeof v.overheadTank !== 'boolean' ||
      typeof v.concealedPiping !== 'boolean'
    ) {
      return null;
    }
    const bathrooms = parseCount(v.bathrooms, 1, 20);
    const kitchens = parseCount(v.kitchens, 1, 10);
    if (bathrooms == null || kitchens == null) return null;
    return {
      service: 'plumber',
      projectAddress: address,
      ...start,
      additionalRequirements: additional,
      scopeType: v.scopeType as PlumberScopeType,
      bathrooms,
      kitchens,
      overheadTank: v.overheadTank,
      concealedPiping: v.concealedPiping,
      materialScope: v.materialScope as PlumberMaterialScope,
    };
  }

  if (v.service === 'electrician') {
    if (
      typeof v.scopeType !== 'string' ||
      !ELECTRICIAN_SCOPE_SET.has(v.scopeType as ElectricianScopeType) ||
      typeof v.pointEstimate !== 'string' ||
      !ELECTRICIAN_POINT_SET.has(v.pointEstimate as ElectricianPointEstimate) ||
      typeof v.materialScope !== 'string' ||
      !ELECTRICIAN_MATERIAL_SET.has(v.materialScope as ElectricianMaterialScope)
    ) {
      return null;
    }
    return {
      service: 'electrician',
      projectAddress: address,
      ...start,
      additionalRequirements: additional,
      scopeType: v.scopeType as ElectricianScopeType,
      pointEstimate: v.pointEstimate as ElectricianPointEstimate,
      heavyAppliances: parseAppliances(v.heavyAppliances),
      materialScope: v.materialScope as ElectricianMaterialScope,
    };
  }

  if (v.service === 'carpenter') {
    if (
      typeof v.scopeType !== 'string' ||
      !CARPENTER_SCOPE_SET.has(v.scopeType as CarpenterScopeType) ||
      typeof v.woodType !== 'string' ||
      !CARPENTER_WOOD_SET.has(v.woodType as CarpenterWoodType)
    ) {
      return null;
    }
    const area = v.approxAreaSqft == null ? null : parsePositiveNumber(v.approxAreaSqft);
    const count = v.doorWindowCount == null ? null : parseCount(v.doorWindowCount, 1, 200);
    if (area == null && count == null) return null;
    return {
      service: 'carpenter',
      projectAddress: address,
      ...start,
      additionalRequirements: additional,
      scopeType: v.scopeType as CarpenterScopeType,
      woodType: v.woodType as CarpenterWoodType,
      approxAreaSqft: area,
      doorWindowCount: count,
    };
  }

  if (v.service === 'false_ceiling_work') {
    if (
      typeof v.scopeType !== 'string' ||
      !INTERIOR_SCOPE_SET.has(v.scopeType as InteriorScopeType)
    ) {
      return null;
    }
    const spaces = parseSpaces(v.targetSpaces);
    const area = parsePositiveNumber(v.interiorAreaSqft);
    if (spaces.length === 0 || area == null) return null;
    return {
      service: 'false_ceiling_work',
      projectAddress: address,
      ...start,
      additionalRequirements: additional,
      scopeType: v.scopeType as InteriorScopeType,
      targetSpaces: spaces,
      interiorAreaSqft: area,
    };
  }

  if (v.service === 'earthwork') {
    if (
      typeof v.workType !== 'string' ||
      !EARTHWORK_TYPE_SET.has(v.workType as EarthworkType) ||
      typeof v.machineRequirement !== 'string' ||
      !EARTHWORK_MACHINE_SET.has(v.machineRequirement as EarthworkMachine) ||
      typeof v.approxVolume !== 'string' ||
      !v.approxVolume.trim()
    ) {
      return null;
    }
    const depth = parsePositiveNumber(v.estimatedDepthFt);
    if (depth == null) return null;
    return {
      service: 'earthwork',
      projectAddress: address,
      ...start,
      additionalRequirements: additional,
      workType: v.workType as EarthworkType,
      machineRequirement: v.machineRequirement as EarthworkMachine,
      estimatedDepthFt: depth,
      approxVolume: v.approxVolume.trim(),
    };
  }

  return null;
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function formatStepperCount(n: number, plusAt: number): string {
  return n >= plusAt ? `${plusAt}+` : String(n);
}

export function getTradeWorkRequirementBlocks(details: TradeDetails): {
  label: string;
  value: string;
}[] {
  const blocks: { label: string; value: string }[] = [
    { label: 'Project Address', value: details.projectAddress },
  ];

  if (details.service === 'plumber') {
    blocks.push(
      { label: 'Scope Type', value: optionLabel(PLUMBER_SCOPE_OPTIONS, details.scopeType) },
      { label: 'Bathrooms', value: formatStepperCount(details.bathrooms, 3) },
      { label: 'Kitchens', value: formatStepperCount(details.kitchens, 3) },
      { label: 'Overhead Water Tank', value: yesNo(details.overheadTank) },
      { label: 'Concealed CPVC/uPVC Piping', value: yesNo(details.concealedPiping) },
      { label: 'Material Scope', value: optionLabel(PLUMBER_MATERIAL_OPTIONS, details.materialScope) },
    );
  } else if (details.service === 'electrician') {
    blocks.push(
      { label: 'Scope Type', value: optionLabel(ELECTRICIAN_SCOPE_OPTIONS, details.scopeType) },
      { label: 'Approximate Points', value: optionLabel(ELECTRICIAN_POINT_OPTIONS, details.pointEstimate) },
      {
        label: 'Heavy Appliances',
        value:
          details.heavyAppliances.length > 0
            ? details.heavyAppliances
                .map((a) => optionLabel(ELECTRICIAN_APPLIANCE_OPTIONS, a))
                .join(', ')
            : 'None selected',
      },
      {
        label: 'Material Scope',
        value: optionLabel(ELECTRICIAN_MATERIAL_OPTIONS, details.materialScope),
      },
    );
  } else if (details.service === 'carpenter') {
    blocks.push(
      { label: 'Scope Type', value: optionLabel(CARPENTER_SCOPE_OPTIONS, details.scopeType) },
      { label: 'Material / Wood Type', value: optionLabel(CARPENTER_WOOD_OPTIONS, details.woodType) },
    );
    if (details.approxAreaSqft != null) {
      blocks.push({
        label: 'Approx. Area',
        value: `${details.approxAreaSqft.toLocaleString('en-IN')} Sq. Ft.`,
      });
    }
    if (details.doorWindowCount != null) {
      blocks.push({
        label: 'Doors / Windows',
        value: String(details.doorWindowCount),
      });
    }
  } else if (details.service === 'false_ceiling_work') {
    blocks.push(
      { label: 'Scope Type', value: optionLabel(INTERIOR_SCOPE_OPTIONS, details.scopeType) },
      {
        label: 'Target Space',
        value: details.targetSpaces
          .map((s) => optionLabel(INTERIOR_SPACE_OPTIONS, s))
          .join(', '),
      },
      {
        label: 'Interior Area',
        value: `${details.interiorAreaSqft.toLocaleString('en-IN')} Sq. Ft.`,
      },
    );
  } else {
    blocks.push(
      { label: 'Work Type', value: optionLabel(EARTHWORK_TYPE_OPTIONS, details.workType) },
      {
        label: 'Machine Requirement',
        value: optionLabel(EARTHWORK_MACHINE_OPTIONS, details.machineRequirement),
      },
      { label: 'Estimated Depth', value: `${details.estimatedDepthFt} Ft.` },
      { label: 'Area / Volume', value: details.approxVolume },
    );
  }

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

export function getTradeScopeLabel(details: TradeDetails): string {
  if (details.service === 'plumber') {
    return optionLabel(PLUMBER_SCOPE_OPTIONS, details.scopeType);
  }
  if (details.service === 'electrician') {
    return optionLabel(ELECTRICIAN_SCOPE_OPTIONS, details.scopeType);
  }
  if (details.service === 'carpenter') {
    return optionLabel(CARPENTER_SCOPE_OPTIONS, details.scopeType);
  }
  if (details.service === 'false_ceiling_work') {
    return optionLabel(INTERIOR_SCOPE_OPTIONS, details.scopeType);
  }
  return optionLabel(EARTHWORK_TYPE_OPTIONS, details.workType);
}

export interface TradeDetailsFormInput {
  service: TradeWorkService;
  projectAddress: string;
  projectStartTimeType: ProjectStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
  plumberScope: PlumberScopeType | null;
  bathrooms: number;
  kitchens: number;
  overheadTank: boolean | null;
  concealedPiping: boolean | null;
  plumberMaterial: PlumberMaterialScope | null;
  electricianScope: ElectricianScopeType | null;
  pointEstimate: ElectricianPointEstimate | null;
  heavyAppliances: ElectricianHeavyAppliance[];
  electricianMaterial: ElectricianMaterialScope | null;
  carpenterScope: CarpenterScopeType | null;
  woodType: CarpenterWoodType | null;
  approxArea: string;
  doorWindowCount: string;
  interiorScope: InteriorScopeType | null;
  targetSpaces: InteriorTargetSpace[];
  interiorArea: string;
  earthworkType: EarthworkType | null;
  machineRequirement: EarthworkMachine | null;
  estimatedDepth: string;
  approxVolume: string;
}

export function validateTradeDetailsInput(
  input: TradeDetailsFormInput,
): { error: string } | { details: TradeDetails } {
  const address = input.projectAddress.trim();
  if (address.length < 4) {
    return { error: 'Enter the project address / location.' };
  }

  const start = validateProjectStartTime({
    projectStartTimeType: input.projectStartTimeType,
    projectStartTimeSpecificDate: input.projectStartTimeSpecificDate,
  });
  if ('error' in start) return start;

  const additional = input.additionalRequirements.trim() || null;
  const base = {
    projectAddress: address,
    projectStartTimeType: start.type,
    projectStartTimeSpecificDate: start.specificDate,
    additionalRequirements: additional,
  };

  if (input.service === 'plumber') {
    if (!input.plumberScope || !PLUMBER_SCOPE_SET.has(input.plumberScope)) {
      return { error: 'Select a plumbing scope type.' };
    }
    if (input.overheadTank == null) {
      return { error: 'Select whether overhead water tank installation is required.' };
    }
    if (input.concealedPiping == null) {
      return { error: 'Select whether concealed CPVC/uPVC piping is required.' };
    }
    if (!input.plumberMaterial || !PLUMBER_MATERIAL_SET.has(input.plumberMaterial)) {
      return { error: 'Select a material scope.' };
    }
    return {
      details: {
        ...base,
        service: 'plumber',
        scopeType: input.plumberScope,
        bathrooms: Math.min(20, Math.max(1, input.bathrooms)),
        kitchens: Math.min(10, Math.max(1, input.kitchens)),
        overheadTank: input.overheadTank,
        concealedPiping: input.concealedPiping,
        materialScope: input.plumberMaterial,
      },
    };
  }

  if (input.service === 'electrician') {
    if (!input.electricianScope || !ELECTRICIAN_SCOPE_SET.has(input.electricianScope)) {
      return { error: 'Select an electrical scope type.' };
    }
    if (!input.pointEstimate || !ELECTRICIAN_POINT_SET.has(input.pointEstimate)) {
      return { error: 'Select the approximate number of points.' };
    }
    if (!input.electricianMaterial || !ELECTRICIAN_MATERIAL_SET.has(input.electricianMaterial)) {
      return { error: 'Select a material scope.' };
    }
    return {
      details: {
        ...base,
        service: 'electrician',
        scopeType: input.electricianScope,
        pointEstimate: input.pointEstimate,
        heavyAppliances: parseAppliances(input.heavyAppliances),
        materialScope: input.electricianMaterial,
      },
    };
  }

  if (input.service === 'carpenter') {
    if (!input.carpenterScope || !CARPENTER_SCOPE_SET.has(input.carpenterScope)) {
      return { error: 'Select a carpentry scope type.' };
    }
    if (!input.woodType || !CARPENTER_WOOD_SET.has(input.woodType)) {
      return { error: 'Select a material / wood type.' };
    }
    const area = parsePositiveNumber(input.approxArea);
    const count = parseCount(input.doorWindowCount, 1, 200);
    if (area == null && count == null) {
      return { error: 'Enter an approximate area (Sq. Ft.) or the number of doors/windows.' };
    }
    return {
      details: {
        ...base,
        service: 'carpenter',
        scopeType: input.carpenterScope,
        woodType: input.woodType,
        approxAreaSqft: area,
        doorWindowCount: count,
      },
    };
  }

  if (input.service === 'false_ceiling_work') {
    if (!input.interiorScope || !INTERIOR_SCOPE_SET.has(input.interiorScope)) {
      return { error: 'Select an interior work scope type.' };
    }
    const spaces = parseSpaces(input.targetSpaces);
    if (spaces.length === 0) {
      return { error: 'Select at least one target space.' };
    }
    const area = parsePositiveNumber(input.interiorArea);
    if (area == null) {
      return { error: 'Enter the approximate interior area in Sq. Ft.' };
    }
    return {
      details: {
        ...base,
        service: 'false_ceiling_work',
        scopeType: input.interiorScope,
        targetSpaces: spaces,
        interiorAreaSqft: area,
      },
    };
  }

  if (input.service === 'earthwork') {
    if (!input.earthworkType || !EARTHWORK_TYPE_SET.has(input.earthworkType)) {
      return { error: 'Select an earthwork type.' };
    }
    if (!input.machineRequirement || !EARTHWORK_MACHINE_SET.has(input.machineRequirement)) {
      return { error: 'Select a machine requirement.' };
    }
    const depth = parsePositiveNumber(input.estimatedDepth);
    if (depth == null) {
      return { error: 'Enter the estimated soil depth in feet.' };
    }
    const volume = input.approxVolume.trim();
    if (!volume) {
      return { error: 'Enter the approximate area / volume (Cu. Ft. / Sq. Ft.).' };
    }
    return {
      details: {
        ...base,
        service: 'earthwork',
        workType: input.earthworkType,
        machineRequirement: input.machineRequirement,
        estimatedDepthFt: depth,
        approxVolume: volume,
      },
    };
  }

  return { error: 'Unsupported trade service.' };
}

export function tradeDetailsMatchesService(
  details: TradeDetails,
  service: TradeServiceType,
): boolean {
  return details.service === service;
}
