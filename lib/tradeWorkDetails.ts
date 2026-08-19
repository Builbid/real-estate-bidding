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

export type BathroomPackage = 'common' | 'master' | 'luxury';

export type CpvcPipeSize =
  | 'three_quarter'
  | 'one'
  | 'one_and_quarter'
  | 'one_and_half'
  | 'two';

export type WaterInstallMethod = 'concealed_wall_cutting' | 'open_outer_fitting';

export type DrainageInstallMethod = 'ground_digging_concrete' | 'open_outer_hanging';

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
  | 'painting_wallpaper'
  | 'modular_kitchen';

export type InteriorTargetSpace = 'living_room' | 'bedrooms' | 'kitchen' | 'full_house';

export type EarthworkType =
  | 'site_clearing'
  | 'foundation_excavation'
  | 'pond_digging'
  | 'soil_filling';

export type EarthworkMachine =
  | 'jcb_excavator'
  | 'tractor_dumper'
  | 'manual_labour'
  | 'tractor'
  | 'dumper';

export type EarthworkSoilVehicle = 'tractor' | 'dumper';

// ─── Stored payloads ────────────────────────────────────────

interface TradeDetailsBase {
  projectAddress?: string | null;
  villageTownName?: string | null;
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
  /** Bathroom fitting package selected by the owner for bidding scope. */
  bathroomPackage?: BathroomPackage | null;
  /** Water supply CPVC pipe sizes opened for multi-option bidding. */
  cpvcPipeSizes?: CpvcPipeSize[];
  /** Water-line install methods opened for bidding (concealed vs open). */
  waterInstallMethods?: WaterInstallMethod[];
  /** When true, plumbers also quote the 4-inch SWR toilet waste line. */
  includeToiletWastePipe?: boolean;
  /** Drainage install methods opened for bidding when the SWR line is included. */
  drainageInstallMethods?: DrainageInstallMethod[];
  /** Legacy field — no longer collected on new plumber submissions. */
  materialScope?: PlumberMaterialScope | null;
}

export interface ElectricianDetails extends TradeDetailsBase {
  service: 'electrician';
  scopeType: ElectricianScopeType;
  pointEstimate: ElectricianPointEstimate;
  heavyAppliances: ElectricianHeavyAppliance[];
  concealedWiring?: boolean | null;
  /** Legacy field — no longer collected on new electrician submissions. */
  materialScope?: ElectricianMaterialScope | null;
}

export interface CarpenterDetails extends TradeDetailsBase {
  service: 'carpenter';
  /** Selected carpentry scopes (one or more). */
  scopeTypes: CarpenterScopeType[];
  /** First selected scope — kept for older stored records and readers. */
  scopeType: CarpenterScopeType;
  /** Required when Door & Window Frames (Chowkhat) is selected. */
  doorWindowFramesQuantity?: string | null;
  /** Required when Modular Kitchen is selected. */
  kitchenSizeLayout?: string | null;
  kitchenMaterialType?: string | null;
  kitchenFittingsHardware?: string | null;
  /** Legacy fields — no longer collected on new carpenter submissions. */
  woodType?: CarpenterWoodType | null;
  approxAreaSqft?: number | null;
  doorWindowCount?: number | null;
}

export interface InteriorDetails extends TradeDetailsBase {
  service: 'false_ceiling_work';
  scopeType: InteriorScopeType;
  targetSpaces: InteriorTargetSpace[];
  interiorAreaSqft: number;
  /** Required when Modular Kitchen is selected. */
  kitchenSizeLayout?: string | null;
  kitchenMaterialType?: string | null;
  kitchenFittingsHardware?: string | null;
}

export interface EarthworkDetails extends TradeDetailsBase {
  service: 'earthwork';
  workType: EarthworkType;
  machineRequirement: EarthworkMachine;
  /** Legacy field — no longer collected on new earthwork submissions. */
  estimatedDepthFt?: number | null;
  /** Legacy field — no longer collected on new earthwork submissions. */
  approxVolume?: string | null;
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
];

const LEGACY_PLUMBER_SCOPE_LABELS: Record<PlumberScopeType, string> = {
  full_house: 'Full House Plumbing (New Construction)',
  bathroom_renovation: 'Bathroom Renovation',
  tank_pipe_fitting: 'Water Tank / Pipe Fitting',
  repair_leakage: 'Repair / Leakage Work',
};

export const PLUMBER_MATERIAL_OPTIONS: { value: PlumberMaterialScope; label: string }[] = [
  { value: 'labour_only', label: 'Labour Only (Client provides materials)' },
  { value: 'labour_plus_pipes', label: 'Labour + Pipes & Fittings' },
];

export const BATHROOM_PACKAGE_OPTIONS: {
  value: BathroomPackage;
  label: string;
  description: string;
  included: string[];
}[] = [
  {
    value: 'common',
    label: 'Common Bathroom Package',
    description: 'Standard fittings for everyday bathrooms.',
    included: [
      '3 Normal Taps',
      '1 Indian Orissa Pan or Standard EWC',
      '1 Overhead Shower',
      'Wall-mounted Flush Tank',
    ],
  },
  {
    value: 'master',
    label: 'Master Bathroom Package',
    description: 'Upgraded concealed fittings for the primary bathroom.',
    included: [
      '2/3-Inlet Diverter or Thermostatic Diverter',
      'Wall-Hung WC',
      'Concealed Flush Tank / Metropole System',
      'Hand & Overhead Shower',
    ],
  },
  {
    value: 'luxury',
    label: 'Luxury Bathroom Package',
    description: 'Premium multi-outlet fittings and smart sanitaryware.',
    included: [
      'Multi-functional Ceiling/Rain Shower',
      'Smart Wall-Hung WC',
      'Multi-outlet Thermostatic Diverter',
      'Premium Brass/Gold Finish Fittings',
    ],
  },
];

export const CPVC_PIPE_SIZE_OPTIONS: { value: CpvcPipeSize; label: string }[] = [
  { value: 'three_quarter', label: '¾ inch' },
  { value: 'one', label: '1 inch' },
  { value: 'one_and_quarter', label: '1¼ inch' },
  { value: 'one_and_half', label: '1½ inch' },
  { value: 'two', label: '2 inch' },
];

export const WATER_INSTALL_METHOD_OPTIONS: {
  value: WaterInstallMethod;
  label: string;
  description: string;
  shortLabel: string;
}[] = [
  {
    value: 'concealed_wall_cutting',
    label: 'Concealed / Wall Cutting',
    shortLabel: 'Concealed / Wall Cutting',
    description: 'Higher rate — pipes chase into walls and are covered after fitting.',
  },
  {
    value: 'open_outer_fitting',
    label: 'Open Outer Fitting',
    shortLabel: 'Open Outer Fitting',
    description: 'Lower rate — pipes run on the outer surface without wall cutting.',
  },
];

export const DRAINAGE_INSTALL_METHOD_OPTIONS: {
  value: DrainageInstallMethod;
  label: string;
  description: string;
  shortLabel: string;
}[] = [
  {
    value: 'ground_digging_concrete',
    label: 'Ground Digging & Concrete Protection',
    shortLabel: 'Ground Digging & Concrete',
    description: 'Waste line buried and protected with concrete around the pipe.',
  },
  {
    value: 'open_outer_hanging',
    label: 'Open Outer Hanging',
    shortLabel: 'Open Outer Hanging',
    description: 'Waste line hung externally without ground excavation.',
  },
];

export const ELECTRICIAN_SCOPE_OPTIONS: { value: ElectricianScopeType; label: string }[] = [
  { value: 'full_house_wiring', label: 'Full House Wiring (New Construction)' },
];

const LEGACY_ELECTRICIAN_SCOPE_LABELS: Record<ElectricianScopeType, string> = {
  full_house_wiring: 'Full House Wiring (New Construction)',
  db_mcb: 'DB Box & MCB Setup',
  switchboard_lights: 'Switchboard & Light Fitting',
  earthing: 'Earthing Installation',
  repair_alteration: 'Repair / Alteration',
};

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
];

const LEGACY_CARPENTER_SCOPE_LABELS: Record<CarpenterScopeType, string> = {
  door_window_frames: 'Door & Window Frames (Chowkhat)',
  modular_kitchen: 'Modular Kitchen',
  wardrobes: 'Wardrobes & Cupboards',
  roof_shuttering: 'Roof Shuttering (Concrete Formwork)',
  furniture: 'Furniture Work',
};

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
  { value: 'modular_kitchen', label: 'Modular Kitchen' },
];

export const INTERIOR_SPACE_OPTIONS: { value: InteriorTargetSpace; label: string }[] = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedrooms', label: 'Bedrooms' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'full_house', label: 'Full House' },
];

export const EARTHWORK_TYPE_OPTIONS: {
  value: EarthworkType;
  label: string;
  description?: string;
}[] = [
  {
    value: 'foundation_excavation',
    label: 'Foundation Excavation (using JCB)',
    description: '(Bidding will be based on rate per hour)',
  },
  {
    value: 'soil_filling',
    label: 'Soil Filling / Backfilling',
    description: '(Bidding will be based on per trip basis)',
  },
];

const LEGACY_EARTHWORK_TYPE_LABELS: Record<EarthworkType, string> = {
  site_clearing: 'Site Clearing & Levelling',
  foundation_excavation: 'Foundation Excavation (using JCB)',
  pond_digging: 'Pond / Water Body Digging',
  soil_filling: 'Soil Filling / Backfilling',
};

export const EARTHWORK_MACHINE_OPTIONS: { value: EarthworkMachine; label: string }[] = [
  { value: 'jcb_excavator', label: 'JCB / Excavator Required' },
  { value: 'tractor_dumper', label: 'Tractor / Dumper Required' },
  { value: 'manual_labour', label: 'Manual Labour Only' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'dumper', label: 'Dumper' },
];

export const EARTHWORK_SOIL_VEHICLE_OPTIONS: {
  value: EarthworkSoilVehicle;
  label: string;
}[] = [
  { value: 'tractor', label: 'Tractor' },
  { value: 'dumper', label: 'Dumper' },
];

const PLUMBER_SCOPE_SET = new Set<PlumberScopeType>([
  'full_house',
  'bathroom_renovation',
  'tank_pipe_fitting',
  'repair_leakage',
]);
const PLUMBER_MATERIAL_SET = new Set(PLUMBER_MATERIAL_OPTIONS.map((o) => o.value));
const BATHROOM_PACKAGE_SET = new Set(BATHROOM_PACKAGE_OPTIONS.map((o) => o.value));
const CPVC_PIPE_SIZE_SET = new Set(CPVC_PIPE_SIZE_OPTIONS.map((o) => o.value));
const WATER_INSTALL_METHOD_SET = new Set(WATER_INSTALL_METHOD_OPTIONS.map((o) => o.value));
const DRAINAGE_INSTALL_METHOD_SET = new Set(DRAINAGE_INSTALL_METHOD_OPTIONS.map((o) => o.value));
const ELECTRICIAN_SCOPE_SET = new Set<ElectricianScopeType>([
  'full_house_wiring',
  'db_mcb',
  'switchboard_lights',
  'earthing',
  'repair_alteration',
]);
const ELECTRICIAN_POINT_SET = new Set(ELECTRICIAN_POINT_OPTIONS.map((o) => o.value));
const ELECTRICIAN_APPLIANCE_SET = new Set(ELECTRICIAN_APPLIANCE_OPTIONS.map((o) => o.value));
const ELECTRICIAN_MATERIAL_SET = new Set(ELECTRICIAN_MATERIAL_OPTIONS.map((o) => o.value));
const CARPENTER_SCOPE_SET = new Set<CarpenterScopeType>([
  'door_window_frames',
  'modular_kitchen',
  'wardrobes',
  'roof_shuttering',
  'furniture',
]);
const SELECTABLE_CARPENTER_SCOPE_SET = new Set(CARPENTER_SCOPE_OPTIONS.map((o) => o.value));
const CARPENTER_WOOD_SET = new Set(CARPENTER_WOOD_OPTIONS.map((o) => o.value));
const INTERIOR_SCOPE_SET = new Set(INTERIOR_SCOPE_OPTIONS.map((o) => o.value));
const INTERIOR_SPACE_SET = new Set(INTERIOR_SPACE_OPTIONS.map((o) => o.value));
const EARTHWORK_TYPE_SET = new Set<EarthworkType>([
  'site_clearing',
  'foundation_excavation',
  'pond_digging',
  'soil_filling',
]);
const SELECTABLE_EARTHWORK_TYPE_SET = new Set(EARTHWORK_TYPE_OPTIONS.map((o) => o.value));
const EARTHWORK_MACHINE_SET = new Set(EARTHWORK_MACHINE_OPTIONS.map((o) => o.value));
const EARTHWORK_SOIL_VEHICLE_SET = new Set(EARTHWORK_SOIL_VEHICLE_OPTIONS.map((o) => o.value));

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

function normalizeVillageTownName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length >= 2 ? trimmed : null;
}

function earthworkTypeLabel(type: EarthworkType): string {
  return (
    EARTHWORK_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    LEGACY_EARTHWORK_TYPE_LABELS[type] ??
    type
  );
}

function normalizeAdditional(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function normalizeOptionalText(raw: unknown): string | null {
  return normalizeAdditional(raw);
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

function parseCarpenterScopes(raw: unknown): CarpenterScopeType[] {
  if (!Array.isArray(raw)) return [];
  const next: CarpenterScopeType[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && CARPENTER_SCOPE_SET.has(item as CarpenterScopeType)) {
      const value = item as CarpenterScopeType;
      if (!next.includes(value)) next.push(value);
    }
  }
  return next;
}

function parseUniqueEnumList<T extends string>(raw: unknown, allowed: Set<T>): T[] {
  if (!Array.isArray(raw)) return [];
  const next: T[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && allowed.has(item as T) && !next.includes(item as T)) {
      next.push(item as T);
    }
  }
  return next;
}

export function parseCpvcPipeSizes(raw: unknown): CpvcPipeSize[] {
  return parseUniqueEnumList(raw, CPVC_PIPE_SIZE_SET);
}

export function parseWaterInstallMethods(raw: unknown): WaterInstallMethod[] {
  return parseUniqueEnumList(raw, WATER_INSTALL_METHOD_SET);
}

export function parseDrainageInstallMethods(raw: unknown): DrainageInstallMethod[] {
  return parseUniqueEnumList(raw, DRAINAGE_INSTALL_METHOD_SET);
}

export function getBathroomPackageLabel(value: BathroomPackage | null | undefined): string {
  if (!value) return '';
  return BATHROOM_PACKAGE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getBathroomPackageIncluded(value: BathroomPackage | null | undefined): string[] {
  if (!value) return [];
  return BATHROOM_PACKAGE_OPTIONS.find((o) => o.value === value)?.included ?? [];
}

export function getCarpenterScopeLabel(value: CarpenterScopeType): string {
  return LEGACY_CARPENTER_SCOPE_LABELS[value] ?? value;
}

export function formatCarpenterScopesSummary(
  scopes: CarpenterScopeType[] | null | undefined,
): string {
  if (!scopes?.length) return 'No scope selected';
  return scopes.map((value) => getCarpenterScopeLabel(value)).join(', ');
}

export function isTradeDetails(value: unknown): value is TradeDetails {
  return parseTradeDetails(value) != null;
}

export function parseTradeDetails(value: unknown): TradeDetails | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const address = normalizeAddress(v.projectAddress);
  const villageTownName = normalizeVillageTownName(v.villageTownName);
  const start = parseStartFields(v);
  if (!start) return null;
  const additional = normalizeAdditional(v.additionalRequirements);

  if (v.service === 'plumber') {
    if (
      typeof v.scopeType !== 'string' ||
      !PLUMBER_SCOPE_SET.has(v.scopeType as PlumberScopeType) ||
      typeof v.overheadTank !== 'boolean' ||
      typeof v.concealedPiping !== 'boolean'
    ) {
      return null;
    }
    const bathrooms = parseCount(v.bathrooms, 1, 20);
    const kitchens = parseCount(v.kitchens, 1, 10);
    if (bathrooms == null || kitchens == null) return null;
    const materialScope =
      typeof v.materialScope === 'string' &&
      PLUMBER_MATERIAL_SET.has(v.materialScope as PlumberMaterialScope)
        ? (v.materialScope as PlumberMaterialScope)
        : null;
    const bathroomPackage =
      typeof v.bathroomPackage === 'string' &&
      BATHROOM_PACKAGE_SET.has(v.bathroomPackage as BathroomPackage)
        ? (v.bathroomPackage as BathroomPackage)
        : null;
    const cpvcPipeSizes = parseCpvcPipeSizes(v.cpvcPipeSizes);
    const waterInstallMethods = parseWaterInstallMethods(v.waterInstallMethods);
    const includeToiletWastePipe = v.includeToiletWastePipe === true;
    const drainageInstallMethods = includeToiletWastePipe
      ? parseDrainageInstallMethods(v.drainageInstallMethods)
      : [];
    return {
      service: 'plumber',
      projectAddress: address,
      villageTownName,
      ...start,
      additionalRequirements: additional,
      scopeType: v.scopeType as PlumberScopeType,
      bathrooms,
      kitchens,
      overheadTank: v.overheadTank,
      concealedPiping: v.concealedPiping,
      bathroomPackage,
      cpvcPipeSizes,
      waterInstallMethods,
      includeToiletWastePipe,
      drainageInstallMethods,
      materialScope,
    };
  }

  if (v.service === 'electrician') {
    if (
      typeof v.scopeType !== 'string' ||
      !ELECTRICIAN_SCOPE_SET.has(v.scopeType as ElectricianScopeType) ||
      typeof v.pointEstimate !== 'string' ||
      !ELECTRICIAN_POINT_SET.has(v.pointEstimate as ElectricianPointEstimate)
    ) {
      return null;
    }
    const materialScope =
      typeof v.materialScope === 'string' &&
      ELECTRICIAN_MATERIAL_SET.has(v.materialScope as ElectricianMaterialScope)
        ? (v.materialScope as ElectricianMaterialScope)
        : null;
    const concealedWiring = typeof v.concealedWiring === 'boolean' ? v.concealedWiring : null;
    return {
      service: 'electrician',
      projectAddress: address,
      villageTownName,
      ...start,
      additionalRequirements: additional,
      scopeType: v.scopeType as ElectricianScopeType,
      pointEstimate: v.pointEstimate as ElectricianPointEstimate,
      heavyAppliances: parseAppliances(v.heavyAppliances),
      concealedWiring,
      materialScope,
    };
  }

  if (v.service === 'carpenter') {
    let scopeTypes = parseCarpenterScopes(v.scopeTypes);
    if (
      scopeTypes.length === 0 &&
      typeof v.scopeType === 'string' &&
      CARPENTER_SCOPE_SET.has(v.scopeType as CarpenterScopeType)
    ) {
      scopeTypes = [v.scopeType as CarpenterScopeType];
    }
    if (scopeTypes.length === 0) return null;
    const woodType =
      typeof v.woodType === 'string' && CARPENTER_WOOD_SET.has(v.woodType as CarpenterWoodType)
        ? (v.woodType as CarpenterWoodType)
        : null;
    const area = v.approxAreaSqft == null ? null : parsePositiveNumber(v.approxAreaSqft);
    const count = v.doorWindowCount == null ? null : parseCount(v.doorWindowCount, 1, 200);
    return {
      service: 'carpenter',
      projectAddress: address,
      villageTownName,
      ...start,
      additionalRequirements: additional,
      scopeTypes,
      scopeType: scopeTypes[0],
      doorWindowFramesQuantity: normalizeOptionalText(v.doorWindowFramesQuantity),
      kitchenSizeLayout: normalizeOptionalText(v.kitchenSizeLayout),
      kitchenMaterialType: normalizeOptionalText(v.kitchenMaterialType),
      kitchenFittingsHardware: normalizeOptionalText(v.kitchenFittingsHardware),
      woodType,
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
      villageTownName,
      ...start,
      additionalRequirements: additional,
      scopeType: v.scopeType as InteriorScopeType,
      targetSpaces: spaces,
      interiorAreaSqft: area,
      kitchenSizeLayout: normalizeOptionalText(v.kitchenSizeLayout),
      kitchenMaterialType: normalizeOptionalText(v.kitchenMaterialType),
      kitchenFittingsHardware: normalizeOptionalText(v.kitchenFittingsHardware),
    };
  }

  if (v.service === 'earthwork') {
    if (
      typeof v.workType !== 'string' ||
      !EARTHWORK_TYPE_SET.has(v.workType as EarthworkType)
    ) {
      return null;
    }
    const workType = v.workType as EarthworkType;
    let machine: EarthworkMachine | null = null;
    if (
      typeof v.machineRequirement === 'string' &&
      EARTHWORK_MACHINE_SET.has(v.machineRequirement as EarthworkMachine)
    ) {
      machine = v.machineRequirement as EarthworkMachine;
    } else if (workType === 'foundation_excavation') {
      machine = 'jcb_excavator';
    }
    if (!machine) return null;
    const depth = parsePositiveNumber(v.estimatedDepthFt);
    const volume =
      typeof v.approxVolume === 'string' && v.approxVolume.trim()
        ? v.approxVolume.trim()
        : null;
    return {
      service: 'earthwork',
      projectAddress: address,
      villageTownName,
      ...start,
      additionalRequirements: additional,
      workType,
      machineRequirement: machine,
      estimatedDepthFt: depth,
      approxVolume: volume,
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
  const blocks: { label: string; value: string }[] = [];
  if (details.projectAddress) {
    blocks.push({ label: 'Project Address', value: details.projectAddress });
  }
  if (details.villageTownName) {
    blocks.push({ label: 'Village / Town Name', value: details.villageTownName });
  }

  if (details.service === 'plumber') {
    blocks.push(
      { label: 'Scope Type', value: LEGACY_PLUMBER_SCOPE_LABELS[details.scopeType] },
      { label: 'Bathrooms', value: formatStepperCount(details.bathrooms, 3) },
      { label: 'Kitchens', value: formatStepperCount(details.kitchens, 3) },
      { label: 'Overhead Water Tank', value: yesNo(details.overheadTank) },
    );
    if (details.bathroomPackage) {
      const included = getBathroomPackageIncluded(details.bathroomPackage);
      blocks.push({
        label: 'Bathroom Package',
        value: getBathroomPackageLabel(details.bathroomPackage),
      });
      if (included.length > 0) {
        blocks.push({
          label: 'Included Work Scope',
          value: included.join(' · '),
        });
      }
    }
    const pipeSizes = details.cpvcPipeSizes ?? [];
    const waterMethods = details.waterInstallMethods ?? [];
    if (pipeSizes.length > 0) {
      blocks.push({
        label: 'Water Supply Lines (CPVC)',
        value: pipeSizes
          .map((size) => optionLabel(CPVC_PIPE_SIZE_OPTIONS, size))
          .join(', '),
      });
    }
    if (waterMethods.length > 0) {
      blocks.push({
        label: 'Water Installation Method',
        value: waterMethods
          .map(
            (method) =>
              WATER_INSTALL_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method,
          )
          .join(', '),
      });
    } else {
      blocks.push({ label: 'Concealed CPVC/uPVC Piping', value: yesNo(details.concealedPiping) });
    }
    if (details.includeToiletWastePipe) {
      const drainageMethods = details.drainageInstallMethods ?? [];
      blocks.push({
        label: 'Soil & Waste Drainage (SWR/PVC)',
        value:
          drainageMethods.length > 0
            ? `4-inch Toilet Waste Pipe · ${drainageMethods
                .map(
                  (method) =>
                    DRAINAGE_INSTALL_METHOD_OPTIONS.find((o) => o.value === method)?.label ??
                    method,
                )
                .join(', ')}`
            : 'Include 4-inch Toilet Waste Pipe (SWR)',
      });
    }
    const plumbingBidLabels: string[] = [];
    for (const size of pipeSizes) {
      for (const method of waterMethods) {
        plumbingBidLabels.push(
          `CPVC ${optionLabel(CPVC_PIPE_SIZE_OPTIONS, size)} — ${
            WATER_INSTALL_METHOD_OPTIONS.find((o) => o.value === method)?.shortLabel ?? method
          }`,
        );
      }
    }
    if (details.includeToiletWastePipe) {
      for (const method of details.drainageInstallMethods ?? []) {
        plumbingBidLabels.push(
          `4-inch Toilet Waste Pipe (SWR) — ${
            DRAINAGE_INSTALL_METHOD_OPTIONS.find((o) => o.value === method)?.shortLabel ?? method
          }`,
        );
      }
    }
    if (plumbingBidLabels.length > 0) {
      blocks.push({
        label: 'Bidding Options (₹ / Running Foot)',
        value: plumbingBidLabels
          .slice(0, 4)
          .map((label, index) => `Option ${String.fromCharCode(65 + index)}: ${label}`)
          .join(' · '),
      });
      blocks.push({
        label: 'Billing Notice',
        value:
          'Final billing will be calculated based on the actual tape measurement at the site using these pre-agreed unit rates.',
      });
    }
    if (details.materialScope) {
      blocks.push({
        label: 'Material Scope',
        value: optionLabel(PLUMBER_MATERIAL_OPTIONS, details.materialScope),
      });
    }
  } else if (details.service === 'electrician') {
    blocks.push(
      { label: 'Scope Type', value: LEGACY_ELECTRICIAN_SCOPE_LABELS[details.scopeType] },
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
    );
    if (details.concealedWiring != null) {
      blocks.push({ label: 'Concealed Wiring', value: yesNo(details.concealedWiring) });
    }
    if (details.materialScope) {
      blocks.push({
        label: 'Material Scope',
        value: optionLabel(ELECTRICIAN_MATERIAL_OPTIONS, details.materialScope),
      });
    }
  } else if (details.service === 'carpenter') {
    blocks.push({
      label: 'Scope Type',
      value: formatCarpenterScopesSummary(details.scopeTypes),
    });
    if (details.scopeTypes.includes('door_window_frames')) {
      const quantity =
        details.doorWindowFramesQuantity ??
        (details.doorWindowCount != null ? String(details.doorWindowCount) : null);
      if (quantity) {
        blocks.push({
          label: 'Quantity / Count (Door & Window Frames)',
          value: quantity,
        });
      }
    }
    if (details.scopeTypes.includes('modular_kitchen')) {
      if (details.kitchenSizeLayout) {
        blocks.push({ label: 'Kitchen Size / Layout', value: details.kitchenSizeLayout });
      }
      if (details.kitchenMaterialType) {
        blocks.push({ label: 'Material Type', value: details.kitchenMaterialType });
      }
      if (details.kitchenFittingsHardware) {
        blocks.push({ label: 'Fittings & Hardware', value: details.kitchenFittingsHardware });
      }
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
    if (details.scopeType === 'modular_kitchen') {
      if (details.kitchenSizeLayout) {
        blocks.push({ label: 'Kitchen Size / Layout', value: details.kitchenSizeLayout });
      }
      if (details.kitchenMaterialType) {
        blocks.push({ label: 'Material Type', value: details.kitchenMaterialType });
      }
      if (details.kitchenFittingsHardware) {
        blocks.push({ label: 'Fittings & Hardware', value: details.kitchenFittingsHardware });
      }
    }
  } else {
    blocks.push({ label: 'Work Type', value: earthworkTypeLabel(details.workType) });
    if (details.workType === 'soil_filling') {
      const vehicleLabel = EARTHWORK_SOIL_VEHICLE_SET.has(
        details.machineRequirement as EarthworkSoilVehicle,
      )
        ? optionLabel(
            EARTHWORK_SOIL_VEHICLE_OPTIONS,
            details.machineRequirement as EarthworkSoilVehicle,
          )
        : optionLabel(EARTHWORK_MACHINE_OPTIONS, details.machineRequirement);
      blocks.push({ label: 'Vehicle Type for Soil Filling', value: vehicleLabel });
    } else if (details.machineRequirement && details.machineRequirement !== 'jcb_excavator') {
      blocks.push({
        label: 'Machine Requirement',
        value: optionLabel(EARTHWORK_MACHINE_OPTIONS, details.machineRequirement),
      });
    }
    if (details.estimatedDepthFt != null) {
      blocks.push({ label: 'Estimated Depth', value: `${details.estimatedDepthFt} Ft.` });
    }
    if (details.approxVolume) {
      blocks.push({ label: 'Area / Volume', value: details.approxVolume });
    }
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
    if (details.bathroomPackage) {
      return getBathroomPackageLabel(details.bathroomPackage);
    }
    return LEGACY_PLUMBER_SCOPE_LABELS[details.scopeType];
  }
  if (details.service === 'electrician') {
    return LEGACY_ELECTRICIAN_SCOPE_LABELS[details.scopeType];
  }
  if (details.service === 'carpenter') {
    return formatCarpenterScopesSummary(details.scopeTypes);
  }
  if (details.service === 'false_ceiling_work') {
    return optionLabel(INTERIOR_SCOPE_OPTIONS, details.scopeType);
  }
  return earthworkTypeLabel(details.workType);
}

export interface TradeDetailsFormInput {
  service: TradeWorkService;
  projectStartTimeType: ProjectStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
  plumberScope?: PlumberScopeType | null;
  bathrooms: number;
  kitchens: number;
  overheadTank: boolean | null;
  concealedPiping: boolean | null;
  bathroomPackage?: BathroomPackage | null;
  cpvcPipeSizes?: CpvcPipeSize[];
  waterInstallMethods?: WaterInstallMethod[];
  includeToiletWastePipe?: boolean;
  drainageInstallMethods?: DrainageInstallMethod[];
  electricianScope?: ElectricianScopeType | null;
  pointEstimate: ElectricianPointEstimate | null;
  heavyAppliances: ElectricianHeavyAppliance[];
  concealedWiring: boolean | null;
  carpenterScopes: CarpenterScopeType[];
  doorWindowFramesQuantity: string;
  kitchenSizeLayout: string;
  kitchenMaterialType: string;
  kitchenFittingsHardware: string;
  interiorScope: InteriorScopeType | null;
  targetSpaces: InteriorTargetSpace[];
  interiorArea: string;
  villageTownName?: string;
  earthworkType: EarthworkType | null;
  machineRequirement: EarthworkMachine | null;
}

export function validateTradeDetailsInput(
  input: TradeDetailsFormInput,
): { error: string } | { details: TradeDetails } {
  const start = validateProjectStartTime({
    projectStartTimeType: input.projectStartTimeType,
    projectStartTimeSpecificDate: input.projectStartTimeSpecificDate,
  });
  if ('error' in start) return start;

  const additional = input.additionalRequirements.trim() || null;
  const villageTownName = normalizeVillageTownName(input.villageTownName);
  if (input.service === 'earthwork' && !villageTownName) {
    return { error: 'Enter the village or town name.' };
  }
  const base = {
    projectStartTimeType: start.type,
    projectStartTimeSpecificDate: start.specificDate,
    additionalRequirements: additional,
    villageTownName: input.service === 'earthwork' ? villageTownName : null,
  };

  if (input.service === 'plumber') {
    if (input.overheadTank == null) {
      return { error: 'Select whether overhead water tank installation is required.' };
    }
    if (!input.bathroomPackage || !BATHROOM_PACKAGE_SET.has(input.bathroomPackage)) {
      return { error: 'Select a bathroom package.' };
    }
    const cpvcPipeSizes = parseCpvcPipeSizes(input.cpvcPipeSizes);
    const waterInstallMethods = parseWaterInstallMethods(input.waterInstallMethods);
    if (cpvcPipeSizes.length === 0) {
      return { error: 'Select at least one CPVC water supply pipe size for bidding.' };
    }
    if (waterInstallMethods.length === 0) {
      return { error: 'Select at least one water supply installation method.' };
    }
    const includeToiletWastePipe = input.includeToiletWastePipe === true;
    const drainageInstallMethods = includeToiletWastePipe
      ? parseDrainageInstallMethods(input.drainageInstallMethods)
      : [];
    if (includeToiletWastePipe && drainageInstallMethods.length === 0) {
      return { error: 'Select a soil & waste drainage installation method.' };
    }
    const optionCount =
      cpvcPipeSizes.length * waterInstallMethods.length +
      (includeToiletWastePipe ? drainageInstallMethods.length : 0);
    if (optionCount < 1) {
      return { error: 'Select at least one piping option for bidding.' };
    }
    if (optionCount > 4) {
      return {
        error:
          'Select at most 4 piping options for bidding (pipe size × installation method, plus drainage).',
      };
    }
    return {
      details: {
        ...base,
        service: 'plumber',
        scopeType: 'full_house',
        bathrooms: Math.min(20, Math.max(1, input.bathrooms)),
        kitchens: Math.min(10, Math.max(1, input.kitchens)),
        overheadTank: input.overheadTank,
        concealedPiping: waterInstallMethods.includes('concealed_wall_cutting'),
        bathroomPackage: input.bathroomPackage,
        cpvcPipeSizes,
        waterInstallMethods,
        includeToiletWastePipe,
        drainageInstallMethods,
      },
    };
  }

  if (input.service === 'electrician') {
    if (!input.pointEstimate || !ELECTRICIAN_POINT_SET.has(input.pointEstimate)) {
      return { error: 'Select the approximate number of points.' };
    }
    if (input.concealedWiring == null) {
      return { error: 'Select whether concealed wiring is required.' };
    }
    return {
      details: {
        ...base,
        service: 'electrician',
        scopeType: 'full_house_wiring',
        pointEstimate: input.pointEstimate,
        heavyAppliances: parseAppliances(input.heavyAppliances),
        concealedWiring: input.concealedWiring,
      },
    };
  }

  if (input.service === 'carpenter') {
    const scopeTypes = parseCarpenterScopes(input.carpenterScopes).filter((value) =>
      SELECTABLE_CARPENTER_SCOPE_SET.has(value),
    );
    if (scopeTypes.length === 0) {
      return { error: 'Select at least one carpentry scope type.' };
    }
    const hasChowkhat = scopeTypes.includes('door_window_frames');
    const hasModularKitchen = scopeTypes.includes('modular_kitchen');
    const doorWindowFramesQuantity = hasChowkhat
      ? normalizeOptionalText(input.doorWindowFramesQuantity)
      : null;
    if (hasChowkhat && !doorWindowFramesQuantity) {
      return { error: 'Enter the quantity / count for door and window frames.' };
    }
    const kitchenSizeLayout = hasModularKitchen
      ? normalizeOptionalText(input.kitchenSizeLayout)
      : null;
    const kitchenMaterialType = hasModularKitchen
      ? normalizeOptionalText(input.kitchenMaterialType)
      : null;
    const kitchenFittingsHardware = hasModularKitchen
      ? normalizeOptionalText(input.kitchenFittingsHardware)
      : null;
    if (hasModularKitchen && !kitchenSizeLayout) {
      return { error: 'Enter the kitchen size / layout.' };
    }
    if (hasModularKitchen && !kitchenMaterialType) {
      return { error: 'Enter the modular kitchen material type.' };
    }
    if (hasModularKitchen && !kitchenFittingsHardware) {
      return { error: 'Enter the fittings & hardware for the modular kitchen.' };
    }
    return {
      details: {
        ...base,
        service: 'carpenter',
        scopeTypes,
        scopeType: scopeTypes[0],
        doorWindowFramesQuantity,
        kitchenSizeLayout,
        kitchenMaterialType,
        kitchenFittingsHardware,
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
    const hasModularKitchen = input.interiorScope === 'modular_kitchen';
    const kitchenSizeLayout = hasModularKitchen
      ? normalizeOptionalText(input.kitchenSizeLayout)
      : null;
    const kitchenMaterialType = hasModularKitchen
      ? normalizeOptionalText(input.kitchenMaterialType)
      : null;
    const kitchenFittingsHardware = hasModularKitchen
      ? normalizeOptionalText(input.kitchenFittingsHardware)
      : null;
    if (hasModularKitchen && !kitchenSizeLayout) {
      return { error: 'Enter the kitchen size / layout.' };
    }
    if (hasModularKitchen && !kitchenMaterialType) {
      return { error: 'Enter the modular kitchen material type.' };
    }
    if (hasModularKitchen && !kitchenFittingsHardware) {
      return { error: 'Enter the fittings & hardware for the modular kitchen.' };
    }
    return {
      details: {
        ...base,
        service: 'false_ceiling_work',
        scopeType: input.interiorScope,
        targetSpaces: spaces,
        interiorAreaSqft: area,
        kitchenSizeLayout,
        kitchenMaterialType,
        kitchenFittingsHardware,
      },
    };
  }

  if (input.service === 'earthwork') {
    if (!input.earthworkType || !SELECTABLE_EARTHWORK_TYPE_SET.has(input.earthworkType)) {
      return { error: 'Select an earthwork type.' };
    }
    let machineRequirement: EarthworkMachine;
    if (input.earthworkType === 'soil_filling') {
      if (
        input.machineRequirement !== 'tractor' &&
        input.machineRequirement !== 'dumper'
      ) {
        return { error: 'Select Tractor or Dumper for soil filling.' };
      }
      machineRequirement = input.machineRequirement;
    } else {
      machineRequirement = 'jcb_excavator';
    }
    return {
      details: {
        ...base,
        service: 'earthwork',
        workType: input.earthworkType,
        machineRequirement,
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
