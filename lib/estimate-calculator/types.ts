// ============================================================
// Construction Material Estimate Calculator — types & defaults
// ============================================================

export type UnitType = '1BHK' | '2BHK' | '3BHK' | '4BHK' | 'Custom';
export type FootingType = 'isolated' | 'combined';
export type WallThickness = '4.5' | '9';
export type MixGrade = 'M15' | 'M20' | 'M25';
export type WastagePercent = 0 | 5 | 10;
export type BarDiameter = 6 | 8 | 10 | 12 | 16 | 20 | 25 | 32;
export type FlooringFinish = 'tile' | 'granite';

/** Fixed stirrup / slab bar spacing (mm) — not client-entered. */
export const STANDARD_BAR_SPACING_MM = 125;

/** Tension lap / development ≈ 50d for HYSD (Fe415/Fe500) estimation practice. */
export const LAP_LENGTH_MULTIPLIER = 50;

export const BUILT_UP_AREA_INFO =
  'Built-up area is the total covered floor area of the building measured from outer wall to outer wall (includes walls, rooms, passages, toilets, kitchen). It is NOT the same as carpet area (usable inside) or plot area. Used for outer walls, flooring bed, and overall building size. Slab area is entered separately — it is the RCC floor/roof slab plan area, which may differ (balconies, projections, or open courts).';

/** Client-entered market rates for costed estimate. */
export interface ItemRates {
  mistriPerSqft: number;
  cementPerBag: number;
  aggregatePerCum: number;
  sandPerCum: number;
  brickPerPiece: number;
  /** ₹ / quintal by bar diameter (mm). */
  steelPerQuintalByDia: Partial<Record<BarDiameter, number>>;
  flooringFinish: FlooringFinish;
}

/** Common diameters shown on the rates page. */
export const STEEL_RATE_DIAMETERS: BarDiameter[] = [6, 8, 10, 12, 16, 20, 25, 32];

export const DEFAULT_ITEM_RATES: ItemRates = {
  mistriPerSqft: 280,
  cementPerBag: 400,
  aggregatePerCum: 2500,
  sandPerCum: 3200,
  brickPerPiece: 10,
  steelPerQuintalByDia: {
    6: 6200,
    8: 6000,
    10: 5800,
    12: 5700,
    16: 5600,
    20: 5500,
    25: 5450,
    32: 5400,
  },
  flooringFinish: 'tile',
};

export interface EstimateInputs {
  floors: number;
  unitType: UnitType;
  /** Outer-to-outer covered area per floor (sqft) — walls, flooring bed, footprint. */
  builtUpAreaPerFloorSqft: number;
  /** RCC slab plan area per floor (sqft) — slab concrete & slab steel. */
  slabAreaPerFloorSqft: number;
  foundationDepthFt: number;
  plinthHeightFt: number;
  floorToFloorHeightFt: number;

  columnCount: number;
  columnWidthMm: number;
  columnDepthMm: number;
  columnRodsCount1: number;
  columnRodDia1Mm: BarDiameter;
  columnRodsCount2: number;
  columnRodDia2Mm: BarDiameter;
  columnStirrupDiaMm: BarDiameter;

  beamCount: number;
  beamWidthMm: number;
  beamDepthMm: number;
  avgBeamLengthFt: number;
  beamRodsCount1: number;
  beamRodDia1Mm: BarDiameter;
  beamRodsCount2: number;
  beamRodDia2Mm: BarDiameter;
  beamStirrupDiaMm: BarDiameter;

  footingType: FootingType;
  footingLengthMm: number;
  footingWidthMm: number;
  footingDepthMm: number;
  footingRodDiaMm: BarDiameter;

  slabThicknessMm: number;
  slabMainDiaMm: BarDiameter;
  slabDistDiaMm: BarDiameter;

  wallThickness: WallThickness;
  /** null = auto from built-up + BHK interiors. */
  wallAreaSqftOverride: number | null;

  mixGrade: MixGrade;
  wastagePercent: WastagePercent;

  /** Client-editable market rates for costed PDF / summary. */
  rates: ItemRates;
}

export const UNIT_TYPE_DEFAULT_AREA: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 550,
  '2BHK': 1000,
  '3BHK': 1400,
  '4BHK': 1800,
};

/** Default slab ≈ built-up; client can raise/lower for balconies / courts. */
export const UNIT_TYPE_DEFAULT_SLAB_AREA = UNIT_TYPE_DEFAULT_AREA;

export const INTERIOR_WALL_LENGTH_FT_PER_FLOOR: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 30,
  '2BHK': 50,
  '3BHK': 70,
  '4BHK': 95,
};

export const BAR_DIAMETERS: BarDiameter[] = [8, 10, 12, 16, 20, 25, 32];
export const STIRRUP_DIAMETERS: BarDiameter[] = [6, 8];

export const MIX_RATIOS: Record<MixGrade, { cement: number; sand: number; aggregate: number; label: string }> = {
  M15: { cement: 1, sand: 2, aggregate: 4, label: 'M15 (1:2:4)' },
  M20: { cement: 1, sand: 1.5, aggregate: 3, label: 'M20 (1:1.5:3)' },
  M25: { cement: 1, sand: 1, aggregate: 2, label: 'M25 (1:1:2)' },
};

export const DEFAULT_INPUTS: EstimateInputs = {
  floors: 2,
  unitType: '2BHK',
  builtUpAreaPerFloorSqft: UNIT_TYPE_DEFAULT_AREA['2BHK'],
  slabAreaPerFloorSqft: UNIT_TYPE_DEFAULT_SLAB_AREA['2BHK'],
  foundationDepthFt: 4,
  plinthHeightFt: 2,
  floorToFloorHeightFt: 10,

  columnCount: 12,
  columnWidthMm: 300,
  columnDepthMm: 300,
  columnRodsCount1: 4,
  columnRodDia1Mm: 16,
  columnRodsCount2: 4,
  columnRodDia2Mm: 12,
  columnStirrupDiaMm: 8,

  beamCount: 20,
  beamWidthMm: 230,
  beamDepthMm: 300,
  avgBeamLengthFt: 12,
  beamRodsCount1: 2,
  beamRodDia1Mm: 16,
  beamRodsCount2: 2,
  beamRodDia2Mm: 12,
  beamStirrupDiaMm: 8,

  footingType: 'isolated',
  footingLengthMm: 1200,
  footingWidthMm: 1200,
  footingDepthMm: 300,
  footingRodDiaMm: 12,

  slabThicknessMm: 125,
  slabMainDiaMm: 10,
  slabDistDiaMm: 8,

  wallThickness: '9',
  wallAreaSqftOverride: null,

  mixGrade: 'M20',
  wastagePercent: 5,

  rates: { ...DEFAULT_ITEM_RATES, steelPerQuintalByDia: { ...DEFAULT_ITEM_RATES.steelPerQuintalByDia } },
};

export interface SteelByDiameter {
  diameterMm: number;
  kg: number;
  quintals: number;
}

export interface EstimateResults {
  concreteVolumeCum: {
    columns: number;
    beams: number;
    footings: number;
    slab: number;
    staircase: number;
    total: number;
  };
  cementBags: number;
  sandCum: number;
  aggregateCum: number;
  bricks: number;
  steelByDiameter: SteelByDiameter[];
  totalSteelQuintals: number;
  wastagePercent: WastagePercent;
  meta: {
    builtUpAreaPerFloorSqft: number;
    slabAreaPerFloorSqft: number;
    slabAreaSqft: number;
    wallAreaSqft: number;
    exteriorWallAreaSqft: number;
    interiorWallAreaSqft: number;
    wallAreaAutoEstimated: boolean;
    footingCount: number;
    totalColumnHeightFt: number;
    cementBagsRcc: number;
    cementBagsBrickMortar: number;
    cementBagsPlaster: number;
    bricksWalls: number;
    bricksFoundationSoling: number;
    bricksFlooring: number;
    staircaseAreaSqft: number;
    standardSpacingMm: number;
    lapMultiplier: number;
  };
}
