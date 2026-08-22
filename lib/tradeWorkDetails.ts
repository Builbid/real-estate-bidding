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

export type BathroomRoomSize = 'standard' | 'large' | 'extra_large';

export type PlumbingFloorLevel = 'ground' | 'first' | 'second_plus';

export type PlumbingHouseStructure = 'assam_type' | 'rcc';

export type PlumbingTargetFloor = 'ground' | 'first' | 'second' | 'custom';

export type PlumbingBuildingStoreys = 'single' | 'g_plus_1' | 'g_plus_2' | 'g_plus_3_plus';

export type PlumbingPackageKind =
  | 'bathroom_fittings'
  | 'water_piping'
  | 'waste_line'
  | 'water_tank';

export type PlumbingSubOptionUnitType = 'per_sqft' | 'per_unit';

export type PlumbingSubOptionId =
  | 'western_commode'
  | 'indian_toilet_pan'
  | 'overhead_shower'
  | 'geyser'
  | 'wash_basin'
  | 'taps_accessories'
  | 'piping_three_quarter_concealed'
  | 'piping_three_quarter_open'
  | 'piping_one_inch_concealed'
  | 'piping_one_inch_open'
  /** @deprecated Replaced by concealed / open 1" main supply options. */
  | 'piping_one_inch_main'
  | 'waste_four_inch_concealed'
  | 'waste_four_inch_open'
  | 'floor_drain_jali'
  | 'tank_500_ltr'
  | 'tank_1000_ltr';

export interface PlumbingSubOptionDef {
  id: PlumbingSubOptionId;
  label: string;
  /** Inline owner-facing note shown under the option label. */
  note?: string;
  unitSuffix: string;
  unitType?: PlumbingSubOptionUnitType;
  isPiping?: boolean;
  weight: number;
}

export type PlumbingWaterTankFloor =
  | 'ground'
  | 'first'
  | 'second'
  | 'third'
  | 'fourth'
  | 'fifth'
  | 'custom';

export type PipingPackageKind = 'non_concealing' | 'concealing';

export type TankDistance = 'under_50' | '50_100' | '100_plus';

export interface BathroomPackageSelection {
  package: BathroomPackage;
  quantity: number;
  size: BathroomRoomSize | null;
  /** Storey for this package. Assam Type is always `ground`. */
  targetFloor: PlumbingTargetFloor | null;
}

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
  /** Bathroom footprint selected by the owner. */
  bathroomSize?: BathroomRoomSize | null;
  /** Storey where the bathroom will be installed. */
  plumbingFloorLevel?: PlumbingFloorLevel | null;
  /** Approximate distance from the bathroom to the overhead tank. */
  tankDistance?: TankDistance | null;
  /** Assam Type vs RCC — drives whether floor multi-select is shown. */
  houseStructure?: PlumbingHouseStructure | null;
  /** Target floors for RCC; Assam Type is always ground. */
  targetFloors?: PlumbingTargetFloor[];
  /** Quantities and sizes per bathroom package category. */
  bathroomPackages?: BathroomPackageSelection[];
  /** Concealing vs open fitting package for tap supply lines. */
  pipingPackage?: PipingPackageKind | null;
  /** Primary / first selected target work floor (legacy single-select). */
  targetWorkFloor?: PlumbingTargetFloor | null;
  /** Free-text floors when `custom` is among the selected target floors. */
  customTargetFloors?: string | null;
  /** Total storeys in the building (optional; no longer collected on Step 1). */
  buildingStoreys?: PlumbingBuildingStoreys | null;
  /** Approximate built-up area in square feet. */
  approxBuiltUpAreaSqft?: number | null;
  /** Main plumbing rate categories checked by the owner. */
  selectedPackages?: PlumbingPackageKind[];
  /** Sub-options opened for unit-rate bidding. */
  selectedSubOptions?: PlumbingSubOptionId[];
  /** RCC-only: floor where the water tank will be fitted. */
  waterTankFloor?: PlumbingWaterTankFloor | null;
  /** Free-text location when the water tank floor is `custom`. */
  customWaterTankFloor?: string | null;
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
  shortLabel: string;
  label: string;
  description: string;
  included: string[];
  pipeDefaults: string[];
}[] = [
  {
    value: 'common',
    shortLabel: 'Common',
    label: 'Common Bathroom Package',
    description: 'Standard fittings for everyday bathrooms.',
    included: [
      '3 Normal Taps',
      '1 Indian Orissa Pan or Standard EWC',
      '1 Overhead Shower',
      'Wall-mounted Flush Tank',
    ],
    pipeDefaults: ['¾ inch CPVC tap supply line', 'Toilet drainage via piping package'],
  },
  {
    value: 'master',
    shortLabel: 'Master',
    label: 'Master Bathroom Package',
    description: 'Upgraded concealed fittings for the primary bathroom.',
    included: [
      '2/3-Inlet Diverter or Thermostatic Diverter',
      'Wall-Hung WC',
      'Concealed Flush Tank / Metropole System',
      'Hand & Overhead Shower',
    ],
    pipeDefaults: ['¾ inch CPVC tap supply line', 'Toilet drainage via piping package'],
  },
  {
    value: 'luxury',
    shortLabel: 'Luxury',
    label: 'Luxury Bathroom Package',
    description: 'Premium multi-outlet fittings and smart sanitaryware.',
    included: [
      'Multi-functional Ceiling/Rain Shower',
      'Smart Wall-Hung WC',
      'Multi-outlet Thermostatic Diverter',
      'Premium Brass/Gold Finish Fittings',
    ],
    pipeDefaults: ['¾ inch CPVC tap supply line', 'Toilet drainage via piping package'],
  },
];

export const BATHROOM_ROOM_SIZE_OPTIONS: {
  value: BathroomRoomSize;
  label: string;
  compactLabel: string;
  description: string;
}[] = [
  {
    value: 'standard',
    label: 'Standard (up to 5x7 ft)',
    compactLabel: '5x7 ft',
    description: 'Compact bathroom typical of common WCs.',
  },
  {
    value: 'large',
    label: 'Large (5x8 ft to 8x10 ft)',
    compactLabel: '6x8 ft',
    description: 'Primary bathroom with extra fixture spacing.',
  },
  {
    value: 'extra_large',
    label: 'Extra Large (10x12 ft+)',
    compactLabel: '10x12 ft+',
    description: 'Wide luxury layout with extra piping runs.',
  },
];

export const PLUMBING_HOUSE_STRUCTURE_OPTIONS: {
  value: PlumbingHouseStructure;
  trackType: 'AssamType' | 'RCC';
  label: string;
  description: string;
}[] = [
  {
    value: 'assam_type',
    trackType: 'AssamType',
    label: 'Assam Type',
    description: 'Traditional Assam-type house. Target work floor is still required.',
  },
  {
    value: 'rcc',
    trackType: 'RCC',
    label: 'RCC Building',
    description: 'Reinforced cement concrete building. Select the floor where plumbing work will happen.',
  },
];

export const PLUMBING_TARGET_FLOOR_OPTIONS: {
  value: PlumbingTargetFloor;
  label: string;
}[] = [
  { value: 'ground', label: 'Ground Floor' },
  { value: 'first', label: '1st Floor' },
  { value: 'second', label: '2nd Floor' },
  { value: 'custom', label: 'Custom / Higher Floors' },
];

export const PLUMBING_BUILDING_STOREYS_OPTIONS: {
  value: PlumbingBuildingStoreys;
  label: string;
  totalFloors: 1 | 2 | 3;
}[] = [
  { value: 'single', label: 'Single Storey', totalFloors: 1 },
  { value: 'g_plus_1', label: 'G+1', totalFloors: 2 },
  { value: 'g_plus_2', label: 'G+2', totalFloors: 3 },
  { value: 'g_plus_3_plus', label: 'G+3+', totalFloors: 3 },
];

export const PLUMBING_SCOPE_PACKAGES: {
  id: PlumbingPackageKind;
  label: string;
  options: PlumbingSubOptionDef[];
}[] = [
  {
    id: 'bathroom_fittings',
    label: 'Bathroom Fittings Rate',
    options: [
      { id: 'western_commode', label: 'Western Commode Fitting', unitSuffix: '/unit', unitType: 'per_unit', weight: 1 },
      { id: 'indian_toilet_pan', label: 'Indian Toilet Pan Fitting', unitSuffix: '/unit', unitType: 'per_unit', weight: 1 },
      { id: 'overhead_shower', label: 'Overhead Shower Fitting', unitSuffix: '/unit', unitType: 'per_unit', weight: 1 },
      { id: 'geyser', label: 'Geyser Fitting', unitSuffix: '/unit', unitType: 'per_unit', weight: 1 },
      { id: 'wash_basin', label: 'Wash Basin Fitting', unitSuffix: '/unit', unitType: 'per_unit', weight: 1 },
      { id: 'taps_accessories', label: 'Taps & Basic Accessories', unitSuffix: '/unit', unitType: 'per_unit', weight: 1 },
    ],
  },
  {
    id: 'water_piping',
    label: 'Water Piping Rate',
    options: [
      {
        id: 'piping_three_quarter_concealed',
        label: '3/4" Concealed Piping',
        note: 'For inside bathroom taps & shower - hidden inside wall',
        unitSuffix: '/sqft',
        unitType: 'per_sqft',
        isPiping: true,
        weight: 1,
      },
      {
        id: 'piping_three_quarter_open',
        label: '3/4" Non-Concealed / Open Piping',
        note: 'For inside bathroom taps & shower - outer open wall',
        unitSuffix: '/sqft',
        unitType: 'per_sqft',
        isPiping: true,
        weight: 1,
      },
      {
        id: 'piping_one_inch_concealed',
        label: '1" Concealed Main Supply Line Piping',
        note: 'Main heavy line from tank to bathroom - hidden inside wall for high water pressure',
        unitSuffix: '/sqft',
        unitType: 'per_sqft',
        isPiping: true,
        weight: 1,
      },
      {
        id: 'piping_one_inch_open',
        label: '1" Non-Concealed / Open Main Supply Line Piping',
        note: 'Main heavy line from tank to bathroom - outer open wall for high water pressure',
        unitSuffix: '/sqft',
        unitType: 'per_sqft',
        isPiping: true,
        weight: 1,
      },
    ],
  },
  {
    id: 'waste_line',
    label: 'Waste Line Rate',
    options: [
      { id: 'waste_four_inch_concealed', label: '4" SWR Concealed Waste Line', unitSuffix: '/point', unitType: 'per_unit', weight: 1 },
      { id: 'waste_four_inch_open', label: '4" SWR Non-Concealed Waste Line', unitSuffix: '/point', unitType: 'per_unit', weight: 1 },
      { id: 'floor_drain_jali', label: 'Floor Drain / Jali Outlet Point', unitSuffix: '/point', unitType: 'per_unit', weight: 1 },
    ],
  },
  {
    id: 'water_tank',
    label: 'Water Tank Fitting Rate',
    options: [
      { id: 'tank_500_ltr', label: '500 Ltr Tank Fitting', unitSuffix: '/unit', unitType: 'per_unit', weight: 1 },
      { id: 'tank_1000_ltr', label: '1000 Ltr Tank Fitting', unitSuffix: '/unit', unitType: 'per_unit', weight: 1 },
    ],
  },
];

/** Kept so stored projects that selected the old combined 1" line still parse. */
export const LEGACY_PLUMBING_SUB_OPTIONS: PlumbingSubOptionDef[] = [
  {
    id: 'piping_one_inch_main',
    label: '1" Main Supply Line Piping',
    unitSuffix: '/sqft',
    unitType: 'per_sqft',
    isPiping: true,
    weight: 1,
  },
];

export const PLUMBING_LABOUR_ONLY_DISCLAIMER =
  'All bids are strictly for LABOUR CHARGES. Materials must be supplied by the Property Owner.';

export const ALL_PLUMBING_SUB_OPTIONS = [
  ...PLUMBING_SCOPE_PACKAGES.flatMap((pkg) => pkg.options),
  ...LEGACY_PLUMBING_SUB_OPTIONS,
];

export const PLUMBING_WATER_TANK_FLOOR_OPTIONS: {
  value: PlumbingWaterTankFloor;
  label: string;
}[] = [
  { value: 'ground', label: 'Ground Floor' },
  { value: 'first', label: '1st Floor' },
  { value: 'second', label: '2nd Floor' },
  { value: 'third', label: '3rd Floor' },
  { value: 'fourth', label: '4th Floor' },
  { value: 'fifth', label: '5th Floor' },
  { value: 'custom', label: 'Other / Custom Floor' },
];

export const PIPING_PACKAGE_OPTIONS: {
  value: PipingPackageKind;
  label: string;
  description: string;
  included: string[];
}[] = [
  {
    value: 'non_concealing',
    label: 'Non-Concealing Package (Open Fitting)',
    description: 'Pipes run on the outer surface without wall cutting.',
    included: [
      'Water Tank Fittings',
      'Toilet Drainage Pipe Work (Non-Concealing / Open)',
      'Tap Supply Line — ¾ inch CPVC (Open Outer Fitting)',
    ],
  },
  {
    value: 'concealing',
    label: 'Concealing Package (Wall-Cut Fitting)',
    description: 'Tap supply lines chase into walls. Toilet waste stays non-concealing.',
    included: [
      'Water Tank Fittings',
      'Toilet Drainage Pipe Work (Non-Concealing, including RCC)',
      'Tap Supply Line — ¾ inch CPVC (Concealed / Wall Cut)',
    ],
  },
];

export const PLUMBING_FLOOR_LEVEL_OPTIONS: {
  value: PlumbingFloorLevel;
  label: string;
}[] = [
  { value: 'ground', label: 'Ground Floor' },
  { value: 'first', label: '1st Floor' },
  { value: 'second_plus', label: '2nd Floor+' },
];

export const TANK_DISTANCE_OPTIONS: {
  value: TankDistance;
  label: string;
}[] = [
  { value: 'under_50', label: '< 50 ft' },
  { value: '50_100', label: '50–100 ft' },
  { value: '100_plus', label: '100+ ft' },
];

/** Tap supply line auto-included so owners skip pipe-diameter choices. */
export const SMART_CPVC_PIPE_SIZES: CpvcPipeSize[] = ['three_quarter'];

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
    label: 'Concealed / Wall Cut',
    shortLabel: 'Concealed / Wall Cut',
    description: 'Pipes chase into walls and are covered after fitting.',
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
const BATHROOM_ROOM_SIZE_SET = new Set(BATHROOM_ROOM_SIZE_OPTIONS.map((o) => o.value));
const PLUMBING_FLOOR_LEVEL_SET = new Set(PLUMBING_FLOOR_LEVEL_OPTIONS.map((o) => o.value));
const PLUMBING_HOUSE_STRUCTURE_SET = new Set(PLUMBING_HOUSE_STRUCTURE_OPTIONS.map((o) => o.value));
const PLUMBING_BUILDING_STOREYS_SET = new Set(PLUMBING_BUILDING_STOREYS_OPTIONS.map((o) => o.value));
const PLUMBING_PACKAGE_KIND_SET = new Set(PLUMBING_SCOPE_PACKAGES.map((o) => o.id));
const PLUMBING_SUB_OPTION_SET = new Set(ALL_PLUMBING_SUB_OPTIONS.map((o) => o.id));
const PIPING_PACKAGE_SET = new Set(PIPING_PACKAGE_OPTIONS.map((o) => o.value));
const TANK_DISTANCE_SET = new Set(TANK_DISTANCE_OPTIONS.map((o) => o.value));
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

export function normalizePlumbingTargetFloor(raw: unknown): PlumbingTargetFloor | null {
  if (raw === 'third_plus' || raw === 'custom') return 'custom';
  if (raw === 'ground' || raw === 'first' || raw === 'second') return raw;
  return null;
}

export function parsePlumbingTargetFloors(raw: unknown): PlumbingTargetFloor[] {
  if (!Array.isArray(raw)) {
    const single = normalizePlumbingTargetFloor(raw);
    return single ? [single] : [];
  }
  const next: PlumbingTargetFloor[] = [];
  for (const item of raw) {
    const floor = normalizePlumbingTargetFloor(item);
    if (floor && !next.includes(floor)) next.push(floor);
  }
  return next;
}

export function parseCustomTargetFloors(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function parsePlumbingPackageKinds(raw: unknown): PlumbingPackageKind[] {
  return parseUniqueEnumList(raw, PLUMBING_PACKAGE_KIND_SET);
}

export function parsePlumbingSubOptionIds(raw: unknown): PlumbingSubOptionId[] {
  if (!Array.isArray(raw)) return [];
  const remapped = raw.map((item) => {
    if (item === 'commode_toilet') return 'western_commode';
    if (item === 'loft_tank') return null;
    return item;
  }).filter((item): item is string => typeof item === 'string');
  return parseUniqueEnumList(remapped, PLUMBING_SUB_OPTION_SET);
}

const CONCEALED_PIPING_SUB_OPTION_IDS = new Set<PlumbingSubOptionId>([
  'piping_three_quarter_concealed',
  'piping_one_inch_concealed',
  'waste_four_inch_concealed',
]);

const OPEN_PIPING_SUB_OPTION_IDS = new Set<PlumbingSubOptionId>([
  'piping_three_quarter_open',
  'piping_one_inch_open',
  'piping_one_inch_main',
  'waste_four_inch_open',
]);

export function isPlumbingPipingSubOption(id: PlumbingSubOptionId): boolean {
  return getPlumbingSubOption(id)?.isPiping === true;
}

export function parsePlumbingWaterTankFloor(raw: unknown): PlumbingWaterTankFloor | null {
  if (raw === 'fourth_plus') return 'fourth';
  if (raw === 'terrace') return 'custom';
  if (
    raw === 'ground' ||
    raw === 'first' ||
    raw === 'second' ||
    raw === 'third' ||
    raw === 'fourth' ||
    raw === 'fifth' ||
    raw === 'custom'
  ) {
    return raw;
  }
  return null;
}

export function getPlumbingWaterTankFloorLabel(
  value: PlumbingWaterTankFloor | null | undefined,
  customText?: string | null,
): string {
  if (!value) return '';
  if (value === 'custom' && customText?.trim()) return customText.trim();
  return PLUMBING_WATER_TANK_FLOOR_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getPlumbingSubOption(id: PlumbingSubOptionId) {
  return ALL_PLUMBING_SUB_OPTIONS.find((option) => option.id === id) ?? null;
}

export function getPlumbingPackageLabel(id: PlumbingPackageKind): string {
  return PLUMBING_SCOPE_PACKAGES.find((pkg) => pkg.id === id)?.label ?? id;
}

export function getPlumbingSubOptionLabel(id: PlumbingSubOptionId): string {
  return getPlumbingSubOption(id)?.label ?? id;
}

export function getPlumbingBuildingStoreysLabel(
  value: PlumbingBuildingStoreys | null | undefined,
): string {
  if (!value) return '';
  return PLUMBING_BUILDING_STOREYS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function buildingStoreysToTotalFloors(
  value: PlumbingBuildingStoreys | null | undefined,
): 1 | 2 | 3 {
  return PLUMBING_BUILDING_STOREYS_OPTIONS.find((o) => o.value === value)?.totalFloors ?? 1;
}

export function targetFloorsToTotalFloors(
  floors: PlumbingTargetFloor[] | null | undefined,
): 1 | 2 | 3 {
  if (!floors?.length) return 1;
  if (floors.includes('custom') || floors.includes('second')) return 3;
  if (floors.includes('first')) return 2;
  return 1;
}

export function subOptionsForPackages(
  packages: PlumbingPackageKind[],
  selected: PlumbingSubOptionId[],
): PlumbingSubOptionId[] {
  const allowed = new Set(
    PLUMBING_SCOPE_PACKAGES.filter((pkg) => packages.includes(pkg.id)).flatMap((pkg) =>
      pkg.options.map((option) => option.id),
    ),
  );
  return selected.filter((id) => allowed.has(id));
}

export function hasPlumbingUnitRateScope(
  details: Pick<PlumberDetails, 'selectedSubOptions' | 'selectedPackages'> | null | undefined,
): boolean {
  return (details?.selectedSubOptions?.length ?? 0) > 0 || (details?.selectedPackages?.length ?? 0) > 0;
}

export function formatPlumbingSubOptionSummary(
  packages: PlumbingPackageKind[] | null | undefined,
  subOptions: PlumbingSubOptionId[] | null | undefined,
): string {
  const selected = subOptions ?? [];
  if (selected.length === 0) {
    return (packages ?? []).map(getPlumbingPackageLabel).join(' + ');
  }
  return selected.map(getPlumbingSubOptionLabel).join(' · ');
}

export function parseBathroomPackageTargetFloor(raw: unknown): PlumbingTargetFloor | null {
  return normalizePlumbingTargetFloor(raw);
}

export function parseBathroomPackageSelections(raw: unknown): BathroomPackageSelection[] {
  if (!Array.isArray(raw)) return [];
  const byPackage = new Map<BathroomPackage, BathroomPackageSelection>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.package !== 'string' || !BATHROOM_PACKAGE_SET.has(row.package as BathroomPackage)) {
      continue;
    }
    const pkg = row.package as BathroomPackage;
    const quantity = parseCount(row.quantity, 0, 10) ?? 0;
    const size =
      typeof row.size === 'string' && BATHROOM_ROOM_SIZE_SET.has(row.size as BathroomRoomSize)
        ? (row.size as BathroomRoomSize)
        : null;
    const targetFloor =
      quantity > 0 ? parseBathroomPackageTargetFloor(row.targetFloor) : null;
    byPackage.set(pkg, { package: pkg, quantity, size, targetFloor });
  }
  return BATHROOM_PACKAGE_OPTIONS.map((opt) => byPackage.get(opt.value) ?? {
    package: opt.value,
    quantity: 0,
    size: null,
    targetFloor: null,
  });
}

export function getBathroomPackageLabel(value: BathroomPackage | null | undefined): string {
  if (!value) return '';
  return BATHROOM_PACKAGE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getBathroomPackageIncluded(value: BathroomPackage | null | undefined): string[] {
  if (!value) return [];
  return BATHROOM_PACKAGE_OPTIONS.find((o) => o.value === value)?.included ?? [];
}

export function getBathroomPackageShortLabel(value: BathroomPackage | null | undefined): string {
  if (!value) return '';
  return BATHROOM_PACKAGE_OPTIONS.find((o) => o.value === value)?.shortLabel ?? value;
}

export function getBathroomRoomSizeLabel(value: BathroomRoomSize | null | undefined): string {
  if (!value) return '';
  return BATHROOM_ROOM_SIZE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getBathroomRoomSizeCompactLabel(
  value: BathroomRoomSize | null | undefined,
): string {
  if (!value) return '';
  return BATHROOM_ROOM_SIZE_OPTIONS.find((o) => o.value === value)?.compactLabel ?? value;
}

export function getPlumbingFloorLevelLabel(value: PlumbingFloorLevel | null | undefined): string {
  if (!value) return '';
  return PLUMBING_FLOOR_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getTankDistanceLabel(value: TankDistance | null | undefined): string {
  if (!value) return '';
  return TANK_DISTANCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getPlumbingHouseStructureLabel(
  value: PlumbingHouseStructure | null | undefined,
): string {
  if (!value) return '';
  return PLUMBING_HOUSE_STRUCTURE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getPlumbingTargetFloorLabel(value: PlumbingTargetFloor): string {
  return PLUMBING_TARGET_FLOOR_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function formatPlumbingTargetWorkFloors(
  floors: PlumbingTargetFloor[] | null | undefined,
  customText?: string | null,
): string {
  if (!floors?.length) return '';
  return floors
    .map((floor) =>
      floor === 'custom' && customText?.trim()
        ? customText.trim()
        : getPlumbingTargetFloorLabel(floor),
    )
    .join(', ');
}

export function getPipingPackageLabel(value: PipingPackageKind | null | undefined): string {
  if (!value) return '';
  return PIPING_PACKAGE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function houseStructureToTrackType(
  value: PlumbingHouseStructure,
): 'AssamType' | 'RCC' {
  return value === 'assam_type' ? 'AssamType' : 'RCC';
}

export function trackTypeToHouseStructure(
  value: string | null | undefined,
): PlumbingHouseStructure | null {
  if (value === 'AssamType') return 'assam_type';
  if (value === 'RCC') return 'rcc';
  return null;
}

export function targetFloorToPlumbingFloorLevel(
  floors: PlumbingTargetFloor[] | null | undefined,
): PlumbingFloorLevel {
  if (!floors?.length) return 'ground';
  if (floors.includes('second') || floors.includes('custom')) return 'second_plus';
  if (floors.includes('first')) return 'first';
  return 'ground';
}

export function emptyBathroomPackageSelections(): BathroomPackageSelection[] {
  return BATHROOM_PACKAGE_OPTIONS.map((pkg) => ({
    package: pkg.value,
    quantity: 0,
    size: null,
    targetFloor: null,
  }));
}

export function applyBathroomPackageHouseStructure(
  selections: BathroomPackageSelection[],
  houseStructure: PlumbingHouseStructure | null,
): BathroomPackageSelection[] {
  return selections.map((item) => {
    if (item.quantity <= 0) {
      return { ...item, targetFloor: null };
    }
    if (houseStructure === 'assam_type') {
      return { ...item, targetFloor: 'ground' };
    }
    return item;
  });
}

export function floorsFromBathroomPackages(
  selections: BathroomPackageSelection[] | null | undefined,
): PlumbingTargetFloor[] {
  const floors: PlumbingTargetFloor[] = [];
  for (const item of activeBathroomPackageSelections(selections)) {
    if (item.targetFloor && !floors.includes(item.targetFloor)) {
      floors.push(item.targetFloor);
    }
  }
  return floors;
}

export function activeBathroomPackageSelections(
  selections: BathroomPackageSelection[] | null | undefined,
): BathroomPackageSelection[] {
  return (selections ?? []).filter((item) => item.quantity > 0);
}

export function formatBathroomPackageItem(item: BathroomPackageSelection): string {
  const name = getBathroomPackageShortLabel(item.package);
  const floor = item.targetFloor
    ? ` - ${getPlumbingTargetFloorLabel(item.targetFloor)}`
    : '';
  const size = item.size ? ` (${getBathroomRoomSizeCompactLabel(item.size)})` : '';
  return `${item.quantity}x ${name} Bathroom${floor}${size}`;
}

export function formatBathroomPackageBidLabel(item: BathroomPackageSelection): string {
  const name = getBathroomPackageShortLabel(item.package);
  const floor = item.targetFloor
    ? ` — ${getPlumbingTargetFloorLabel(item.targetFloor)}`
    : '';
  const size = item.size ? ` (${getBathroomRoomSizeCompactLabel(item.size)})` : '';
  return `${name} Bathroom Package Rate × ${item.quantity}${floor}${size}`;
}

export function formatBathroomPackageSelections(
  selections: BathroomPackageSelection[] | null | undefined,
): string {
  const active = activeBathroomPackageSelections(selections);
  if (active.length === 0) return '';
  return active.map(formatBathroomPackageItem).join(' + ');
}

export function resolvePlumbingPackageDefaults(pipingPackage: PipingPackageKind): {
  cpvcPipeSizes: CpvcPipeSize[];
  waterInstallMethods: WaterInstallMethod[];
  includeToiletWastePipe: true;
  drainageInstallMethods: DrainageInstallMethod[];
  concealedPiping: boolean;
} {
  const fitting: WaterInstallMethod =
    pipingPackage === 'concealing' ? 'concealed_wall_cutting' : 'open_outer_fitting';
  return {
    cpvcPipeSizes: [...SMART_CPVC_PIPE_SIZES],
    waterInstallMethods: [fitting],
    includeToiletWastePipe: true,
    drainageInstallMethods: ['open_outer_hanging'],
    concealedPiping: pipingPackage === 'concealing',
  };
}

export function resolvePlumbingSmartDefaults(
  fittingType: WaterInstallMethod,
  _floorLevel: PlumbingFloorLevel,
): {
  cpvcPipeSizes: CpvcPipeSize[];
  waterInstallMethods: WaterInstallMethod[];
  includeToiletWastePipe: true;
  drainageInstallMethods: DrainageInstallMethod[];
  concealedPiping: boolean;
} {
  return resolvePlumbingPackageDefaults(
    fittingType === 'concealed_wall_cutting' ? 'concealing' : 'non_concealing',
  );
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
    const houseStructure =
      typeof v.houseStructure === 'string' &&
      PLUMBING_HOUSE_STRUCTURE_SET.has(v.houseStructure as PlumbingHouseStructure)
        ? (v.houseStructure as PlumbingHouseStructure)
        : null;
    const bathroomPackages = applyBathroomPackageHouseStructure(
      parseBathroomPackageSelections(v.bathroomPackages),
      houseStructure,
    );
    const activePackages = activeBathroomPackageSelections(bathroomPackages);
    const bathroomTotal =
      bathrooms ??
      (activePackages.length > 0
        ? Math.min(20, Math.max(1, activePackages.reduce((sum, item) => sum + item.quantity, 0)))
        : null);
    if (bathroomTotal == null || kitchens == null) return null;
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
    const bathroomSize =
      typeof v.bathroomSize === 'string' &&
      BATHROOM_ROOM_SIZE_SET.has(v.bathroomSize as BathroomRoomSize)
        ? (v.bathroomSize as BathroomRoomSize)
        : null;
    const plumbingFloorLevel =
      typeof v.plumbingFloorLevel === 'string' &&
      PLUMBING_FLOOR_LEVEL_SET.has(v.plumbingFloorLevel as PlumbingFloorLevel)
        ? (v.plumbingFloorLevel as PlumbingFloorLevel)
        : null;
    const tankDistance =
      typeof v.tankDistance === 'string' &&
      TANK_DISTANCE_SET.has(v.tankDistance as TankDistance)
        ? (v.tankDistance as TankDistance)
        : null;
    const selectedPackages = parsePlumbingPackageKinds(v.selectedPackages);
    const selectedSubOptions = subOptionsForPackages(
      selectedPackages,
      parsePlumbingSubOptionIds(v.selectedSubOptions),
    );
    const parsedTargetFloors = parsePlumbingTargetFloors(v.targetFloors);
    const parsedWorkFloor = normalizePlumbingTargetFloor(v.targetWorkFloor);
    const customTargetFloors = parseCustomTargetFloors(v.customTargetFloors);
    const buildingStoreys =
      typeof v.buildingStoreys === 'string' &&
      PLUMBING_BUILDING_STOREYS_SET.has(v.buildingStoreys as PlumbingBuildingStoreys)
        ? (v.buildingStoreys as PlumbingBuildingStoreys)
        : null;
    const approxBuiltUpAreaSqft = parsePositiveNumber(v.approxBuiltUpAreaSqft);
    const waterTankFloor = parsePlumbingWaterTankFloor(v.waterTankFloor);
    const customWaterTankFloor =
      waterTankFloor === 'custom'
        ? parseCustomTargetFloors(v.customWaterTankFloor) ??
          (v.waterTankFloor === 'terrace' ? 'Terrace / Roof' : null)
        : null;
    const packageFloors = floorsFromBathroomPackages(bathroomPackages);
    const targetFloors =
      parsedTargetFloors.length > 0
        ? parsedTargetFloors
        : parsedWorkFloor
          ? ([parsedWorkFloor] as PlumbingTargetFloor[])
          : houseStructure === 'assam_type'
            ? (['ground'] as PlumbingTargetFloor[])
            : packageFloors;
    const targetWorkFloor = parsedWorkFloor ?? targetFloors[0] ?? null;
    const pipingPackage =
      typeof v.pipingPackage === 'string' &&
      PIPING_PACKAGE_SET.has(v.pipingPackage as PipingPackageKind)
        ? (v.pipingPackage as PipingPackageKind)
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
      bathrooms: bathroomTotal,
      kitchens,
      overheadTank: v.overheadTank,
      concealedPiping: v.concealedPiping,
      bathroomPackage:
        bathroomPackage ??
        (activePackages[0]?.package ?? null),
      bathroomSize:
        bathroomSize ??
        (activePackages[0]?.size ?? null),
      plumbingFloorLevel:
        plumbingFloorLevel ?? targetFloorToPlumbingFloorLevel(targetFloors),
      tankDistance,
      houseStructure,
      targetFloors,
      targetWorkFloor: targetWorkFloor ?? targetFloors[0] ?? null,
      customTargetFloors: targetFloors.includes('custom') ? customTargetFloors : null,
      buildingStoreys,
      approxBuiltUpAreaSqft,
      selectedPackages,
      selectedSubOptions,
      waterTankFloor:
        houseStructure === 'rcc' && selectedPackages.includes('water_tank')
          ? waterTankFloor
          : null,
      customWaterTankFloor:
        houseStructure === 'rcc' && selectedPackages.includes('water_tank') && waterTankFloor === 'custom'
          ? customWaterTankFloor
          : null,
      bathroomPackages,
      pipingPackage,
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
    const pipeSizes = details.cpvcPipeSizes ?? [];
    const waterMethods = details.waterInstallMethods ?? [];
    const activePackages = activeBathroomPackageSelections(details.bathroomPackages);
    const selectedPackages = details.selectedPackages ?? [];
    const selectedSubOptions = details.selectedSubOptions ?? [];
    const hasUnitRateScope = selectedPackages.length > 0 || selectedSubOptions.length > 0;
    const hasPackageSystem = activePackages.length > 0 || Boolean(details.pipingPackage);
    const hasSimplifiedScope = Boolean(
      details.bathroomSize || details.plumbingFloorLevel || details.tankDistance,
    );

    if (hasUnitRateScope) {
      if (details.houseStructure) {
        blocks.push({
          label: 'Building Structure Type',
          value: getPlumbingHouseStructureLabel(details.houseStructure),
        });
      }
      const workFloors =
        details.targetFloors && details.targetFloors.length > 0
          ? details.targetFloors
          : details.targetWorkFloor
            ? [details.targetWorkFloor]
            : [];
      if (workFloors.length > 0) {
        blocks.push({
          label: 'Target Work Floor',
          value: formatPlumbingTargetWorkFloors(workFloors, details.customTargetFloors),
        });
      }
      if (details.approxBuiltUpAreaSqft != null) {
        blocks.push({
          label: 'Approx Built-Up Area',
          value: `${details.approxBuiltUpAreaSqft.toLocaleString('en-IN')} Sq Ft`,
        });
      }
      for (const pkg of PLUMBING_SCOPE_PACKAGES) {
        if (!selectedPackages.includes(pkg.id)) continue;
        const picked = pkg.options.filter((option) => selectedSubOptions.includes(option.id));
        blocks.push({
          label: pkg.label,
          value:
            picked.length > 0
              ? picked
                  .map((option) =>
                    option.note ? `${option.label} (${option.note})` : option.label,
                  )
                  .join('\n')
              : 'No sub-options selected',
        });
        if (pkg.id === 'water_tank' && details.houseStructure === 'rcc' && details.waterTankFloor) {
          blocks.push({
            label: 'Water Tank Floor',
            value: getPlumbingWaterTankFloorLabel(
              details.waterTankFloor,
              details.customWaterTankFloor,
            ),
          });
        }
      }
      blocks.push({
        label: 'Material Scope',
        value: PLUMBING_LABOUR_ONLY_DISCLAIMER,
      });
    } else if (hasPackageSystem) {
      if (details.houseStructure) {
        blocks.push({
          label: 'House Structure',
          value: getPlumbingHouseStructureLabel(details.houseStructure),
        });
      }
      if (activePackages.length > 0) {
        blocks.push({
          label: 'Bathroom Packages',
          value: formatBathroomPackageSelections(activePackages),
        });
        for (const item of activePackages) {
          const included = getBathroomPackageIncluded(item.package);
          if (included.length > 0) {
            blocks.push({
              label: `${getBathroomPackageShortLabel(item.package)} included scope`,
              value: included.join(' · '),
            });
          }
        }
      }
      if (details.pipingPackage) {
        const piping = PIPING_PACKAGE_OPTIONS.find((o) => o.value === details.pipingPackage);
        blocks.push({
          label: 'Piping Package',
          value: getPipingPackageLabel(details.pipingPackage),
        });
        if (piping) {
          blocks.push({
            label: 'Piping Package Includes',
            value: piping.included.join('\n'),
          });
        }
      }
    } else if (hasSimplifiedScope) {
      blocks.push({
        label: 'Package Level',
        value: getBathroomPackageLabel(details.bathroomPackage) || 'Not specified',
      });
      if (details.bathroomPackage) {
        const included = getBathroomPackageIncluded(details.bathroomPackage);
        if (included.length > 0) {
          blocks.push({
            label: 'Included Work Scope',
            value: included.join(' · '),
          });
        }
      }
      if (details.bathroomSize) {
        blocks.push({
          label: 'Room Size',
          value: getBathroomRoomSizeLabel(details.bathroomSize),
        });
      }
      blocks.push({
        label: 'Floor',
        value: getPlumbingFloorLevelLabel(details.plumbingFloorLevel ?? 'ground') || 'Ground Floor',
      });
      blocks.push({
        label: 'Installation Method',
        value:
          waterMethods.length > 0
            ? waterMethods
                .map(
                  (method) =>
                    WATER_INSTALL_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method,
                )
                .join(', ')
            : details.concealedPiping
              ? 'Concealed / Wall Cut'
              : 'Open Outer Fitting',
      });
      if (details.tankDistance) {
        blocks.push({
          label: 'Distance to Tank',
          value: getTankDistanceLabel(details.tankDistance),
        });
      }
    } else {
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
    }

    if (!hasPackageSystem && hasSimplifiedScope && (details.includeToiletWastePipe || pipeSizes.length > 0)) {
      const drainageMethods = details.drainageInstallMethods ?? [];
      const supplyLabel =
        pipeSizes.length > 0
          ? pipeSizes.map((size) => `CPVC ${optionLabel(CPVC_PIPE_SIZE_OPTIONS, size)}`).join(' · ')
          : 'CPVC ¾ inch · CPVC 1 inch';
      const wasteLabel = details.includeToiletWastePipe
        ? drainageMethods.length > 0
          ? `4-inch Toilet Waste Pipe (SWR) — ${drainageMethods
              .map(
                (method) =>
                  DRAINAGE_INSTALL_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method,
              )
              .join(', ')}`
          : '4-inch Toilet Waste Pipe (SWR)'
        : null;
      blocks.push({
        label: 'Smart Piping Defaults',
        value: [supplyLabel, wasteLabel].filter(Boolean).join('\n'),
      });
    }

    if (!hasPackageSystem && !hasSimplifiedScope && details.includeToiletWastePipe) {
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
    if (hasUnitRateScope) {
      for (const optionId of selectedSubOptions) {
        const option = getPlumbingSubOption(optionId);
        const suffix = option?.unitSuffix ?? '/unit';
        plumbingBidLabels.push(`${getPlumbingSubOptionLabel(optionId)} (₹ ${suffix})`);
      }
    } else if (hasPackageSystem) {
      for (const item of activePackages) {
        plumbingBidLabels.push(formatBathroomPackageBidLabel(item));
      }
      plumbingBidLabels.push('Tap Water Pipe — ¾ inch CPVC (₹ / Running Foot)');
      plumbingBidLabels.push('Toilet Drainage Pipe — 4-inch SWR, Non-Concealing (₹ / Running Foot)');
    } else {
      if (details.bathroomPackage) {
        plumbingBidLabels.push(
          `Bathroom Package Rate — ${getBathroomPackageLabel(details.bathroomPackage)}`,
        );
      }
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
    }
    if (plumbingBidLabels.length > 0) {
      blocks.push({
        label: 'Bidding Options',
        value: (hasUnitRateScope ? plumbingBidLabels : plumbingBidLabels.slice(0, 4))
          .map((label, index) => `Option ${String.fromCharCode(65 + index)}: ${label}`)
          .join(hasUnitRateScope ? '\n' : ' · '),
      });
      blocks.push({
        label: 'Billing Notice',
        value: hasUnitRateScope
          ? PLUMBING_LABOUR_ONLY_DISCLAIMER
          : 'Final settlement will be based on actual site measurement at agreed unit rates.',
      });
    }
    if (details.materialScope && !hasUnitRateScope) {
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
    const unitSummary = formatPlumbingSubOptionSummary(
      details.selectedPackages,
      details.selectedSubOptions,
    );
    if (unitSummary) return unitSummary;
    const packageSummary = formatBathroomPackageSelections(details.bathroomPackages);
    if (packageSummary) return packageSummary;
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
  bathroomSize?: BathroomRoomSize | null;
  plumbingFloorLevel?: PlumbingFloorLevel | null;
  tankDistance?: TankDistance | null;
  fittingType?: WaterInstallMethod | null;
  houseStructure?: PlumbingHouseStructure | null;
  targetFloors?: PlumbingTargetFloor[];
  targetWorkFloor?: PlumbingTargetFloor | null;
  customTargetFloors?: string | null;
  buildingStoreys?: PlumbingBuildingStoreys | null;
  approxBuiltUpAreaSqft?: string | number | null;
  selectedPackages?: PlumbingPackageKind[];
  selectedSubOptions?: PlumbingSubOptionId[];
  waterTankFloor?: PlumbingWaterTankFloor | null;
  customWaterTankFloor?: string | null;
  bathroomPackages?: BathroomPackageSelection[];
  pipingPackage?: PipingPackageKind | null;
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
    const houseStructure =
      input.houseStructure && PLUMBING_HOUSE_STRUCTURE_SET.has(input.houseStructure)
        ? input.houseStructure
        : null;
    if (!houseStructure) {
      return { error: 'Select the building structure type.' };
    }
    const targetFloors = parsePlumbingTargetFloors(
      input.targetFloors?.length
        ? input.targetFloors
        : input.targetWorkFloor
          ? [input.targetWorkFloor]
          : [],
    );
    if (targetFloors.length === 0) {
      return { error: 'Select at least one target work floor.' };
    }
    const customTargetFloors = targetFloors.includes('custom')
      ? parseCustomTargetFloors(input.customTargetFloors)
      : null;
    if (targetFloors.includes('custom') && !customTargetFloors) {
      return { error: 'Enter the custom / higher floor numbers.' };
    }
    const targetWorkFloor = targetFloors[0];
    const buildingStoreys =
      input.buildingStoreys && PLUMBING_BUILDING_STOREYS_SET.has(input.buildingStoreys)
        ? input.buildingStoreys
        : null;
    const approxBuiltUpAreaSqft = parsePositiveNumber(input.approxBuiltUpAreaSqft);
    if (approxBuiltUpAreaSqft == null) {
      return { error: 'Enter the approximate built-up area in Sq Ft.' };
    }
    const selectedPackages = parsePlumbingPackageKinds(input.selectedPackages);
    if (selectedPackages.length === 0) {
      return { error: 'Select at least one plumbing category.' };
    }
    const selectedSubOptions = subOptionsForPackages(
      selectedPackages,
      parsePlumbingSubOptionIds(input.selectedSubOptions),
    );
    for (const pkg of selectedPackages) {
      const catalog = PLUMBING_SCOPE_PACKAGES.find((item) => item.id === pkg);
      const picked = catalog?.options.filter((option) => selectedSubOptions.includes(option.id)) ?? [];
      if (picked.length === 0) {
        return { error: `Select at least one sub-option for ${getPlumbingPackageLabel(pkg)}.` };
      }
    }
    const requiresTankFloor = houseStructure === 'rcc' && selectedPackages.includes('water_tank');
    const waterTankFloor = requiresTankFloor
      ? parsePlumbingWaterTankFloor(input.waterTankFloor)
      : null;
    if (requiresTankFloor && !waterTankFloor) {
      return { error: 'Select the floor where the water tank will be fitted.' };
    }
    const customWaterTankFloor =
      waterTankFloor === 'custom' ? parseCustomTargetFloors(input.customWaterTankFloor) : null;
    if (requiresTankFloor && waterTankFloor === 'custom' && !customWaterTankFloor) {
      return { error: 'Enter the custom water tank floor location.' };
    }
    const hasConcealedPiping = selectedSubOptions.some((id) =>
      CONCEALED_PIPING_SUB_OPTION_IDS.has(id),
    );
    const hasOpenPiping = selectedSubOptions.some((id) => OPEN_PIPING_SUB_OPTION_IDS.has(id));
    const pipingPackage: PipingPackageKind = hasConcealedPiping && !hasOpenPiping
      ? 'concealing'
      : 'non_concealing';
    const smart = resolvePlumbingPackageDefaults(pipingPackage);
    return {
      details: {
        ...base,
        service: 'plumber',
        scopeType: 'full_house',
        bathrooms: 1,
        kitchens: 1,
        overheadTank: selectedPackages.includes('water_tank'),
        concealedPiping: hasConcealedPiping || smart.concealedPiping,
        bathroomPackage: null,
        bathroomSize: null,
        plumbingFloorLevel: targetFloorToPlumbingFloorLevel(targetFloors),
        tankDistance: null,
        houseStructure,
        targetFloors,
        targetWorkFloor,
        customTargetFloors,
        buildingStoreys,
        approxBuiltUpAreaSqft,
        selectedPackages,
        selectedSubOptions,
        waterTankFloor,
        customWaterTankFloor,
        bathroomPackages: emptyBathroomPackageSelections(),
        pipingPackage,
        cpvcPipeSizes: smart.cpvcPipeSizes,
        waterInstallMethods: smart.waterInstallMethods,
        includeToiletWastePipe: selectedPackages.includes('waste_line'),
        drainageInstallMethods: smart.drainageInstallMethods,
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
