// ============================================================
// Construction Material Estimate Calculator — types & defaults
// Self-contained; does not touch bidding / auction models.
// ============================================================

export type UnitType = '1BHK' | '2BHK' | '3BHK' | '4BHK' | 'Custom';
export type FootingType = 'isolated' | 'combined';
export type WallThickness = '4.5' | '9';
export type MixGrade = 'M15' | 'M20' | 'M25';
export type WastagePercent = 0 | 5 | 10;
export type BarDiameter = 6 | 8 | 10 | 12 | 16 | 20 | 25 | 32;

export interface EstimateInputs {
  // Structure basics
  floors: number;
  unitType: UnitType;
  builtUpAreaPerFloorSqft: number;
  foundationDepthFt: number;
  plinthHeightFt: number;
  floorToFloorHeightFt: number;

  // Columns
  columnCount: number;
  columnWidthMm: number;
  columnDepthMm: number;
  rodsPerColumn: number;
  columnRodDiaMm: BarDiameter;
  columnStirrupDiaMm: BarDiameter;
  columnStirrupSpacingMm: number;

  // Beams
  beamCount: number;
  beamWidthMm: number;
  beamDepthMm: number;
  avgBeamLengthFt: number;
  rodsPerBeam: number;
  beamRodDiaMm: BarDiameter;
  beamStirrupDiaMm: BarDiameter;
  beamStirrupSpacingMm: number;

  // Footing
  footingType: FootingType;
  footingLengthMm: number;
  footingWidthMm: number;
  footingDepthMm: number;
  /** Rods in ONE direction per footing (two-way mesh doubles this in calc). */
  rodsPerFootingOneWay: number;
  footingRodDiaMm: BarDiameter;

  // Slab
  slabThicknessMm: number;
  /** Override; if null, auto = builtUp × floors. */
  slabAreaSqftOverride: number | null;
  slabMainDiaMm: BarDiameter;
  slabMainSpacingMm: number;
  slabDistDiaMm: BarDiameter;
  slabDistSpacingMm: number;

  // Walls
  wallThickness: WallThickness;
  /** Override; if null, auto-estimate from footprint. */
  wallAreaSqftOverride: number | null;

  // Mix & wastage
  mixGrade: MixGrade;
  wastagePercent: WastagePercent;
}

/** Typical Indian residential built-up areas (sq ft) used when unit type ≠ Custom. */
export const UNIT_TYPE_DEFAULT_AREA: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 550,
  '2BHK': 1000,
  '3BHK': 1400,
  '4BHK': 1800,
};

/**
 * Standard interior partition running length (ft) PER FLOOR for typical Indian
 * residential layouts (room dividers between living / bedrooms / kitchen / baths).
 * Used with floor height × floors to get interior wall area. Custom uses a
 * built-up–based estimate instead.
 */
export const INTERIOR_WALL_LENGTH_FT_PER_FLOOR: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 30,  // living + 1 bed + kitchen + bath partitions
  '2BHK': 50,  // living + 2 beds + kitchen + baths
  '3BHK': 70,  // living + 3 beds + kitchen + baths
  '4BHK': 95,  // living + 4 beds + kitchen + baths / utility
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
  foundationDepthFt: 4,
  plinthHeightFt: 2,
  floorToFloorHeightFt: 10,

  columnCount: 12,
  columnWidthMm: 300,
  columnDepthMm: 300,
  rodsPerColumn: 8,
  columnRodDiaMm: 16,
  columnStirrupDiaMm: 8,
  columnStirrupSpacingMm: 150,

  beamCount: 20,
  beamWidthMm: 230,
  beamDepthMm: 300,
  avgBeamLengthFt: 12,
  rodsPerBeam: 4,
  beamRodDiaMm: 12,
  beamStirrupDiaMm: 8,
  beamStirrupSpacingMm: 150,

  footingType: 'isolated',
  footingLengthMm: 1200,
  footingWidthMm: 1200,
  footingDepthMm: 300,
  rodsPerFootingOneWay: 8,
  footingRodDiaMm: 12,

  slabThicknessMm: 125,
  slabAreaSqftOverride: null,
  slabMainDiaMm: 10,
  slabMainSpacingMm: 150,
  slabDistDiaMm: 8,
  slabDistSpacingMm: 200,

  wallThickness: '9',
  wallAreaSqftOverride: null,

  mixGrade: 'M20',
  wastagePercent: 5,
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
    total: number;
  };
  /** Total cement bags (RCC + brick mortar + plaster). */
  cementBags: number;
  sandCum: number;
  aggregateCum: number;
  bricks: number;
  steelByDiameter: SteelByDiameter[];
  totalSteelQuintals: number;
  wastagePercent: WastagePercent;
  meta: {
    slabAreaSqft: number;
    /** Exterior + interior wall face area (sqft), one face. */
    wallAreaSqft: number;
    exteriorWallAreaSqft: number;
    interiorWallAreaSqft: number;
    wallAreaAutoEstimated: boolean;
    footingCount: number;
    totalColumnHeightFt: number;
    /** Cement bags breakdown before wastage rounding (informative). */
    cementBagsRcc: number;
    cementBagsBrickMortar: number;
    cementBagsPlaster: number;
  };
}
