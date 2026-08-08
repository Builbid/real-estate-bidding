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

/** Top-level calculator path. */
export type HouseConstructionType = 'rcc' | 'assam_type';

/** Assam Type roof truss. */
export type AssamTrussType = 'rcc_king_post' | 'timber';

/** Above-plinth Assam walls — 5″ (≈ 125 mm). Plinth band remains 9″. */
export const ASSAM_WALL_THICKNESS_M = 0.125;
export const ASSAM_PLINTH_THICKNESS_M = 0.2286;

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

/** Per-storey layout — BHK and toilet count entered separately (toilets not assumed from BHK). */
export interface FloorConfig {
  unitType: UnitType;
  /** Toilet / bath units on this floor (user-entered). */
  toilets: number;
}

/** Suggested toilet count when BHK changes — user can lower/raise freely. */
export const DEFAULT_TOILETS_FOR_UNIT: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 1,
  '2BHK': 1,
  '3BHK': 2,
  '4BHK': 2,
};

export function defaultToiletsForUnit(unitType: UnitType): number {
  if (unitType !== 'Custom') return DEFAULT_TOILETS_FOR_UNIT[unitType];
  return 1;
}

/** Resize / pad floorConfigs when storey count changes. */
export function syncFloorConfigs(
  floors: number,
  prev: FloorConfig[],
  fallbackUnit: UnitType = '2BHK',
): FloorConfig[] {
  const n = Math.max(1, Math.floor(floors));
  const next: FloorConfig[] = [];
  for (let i = 0; i < n; i++) {
    const existing = prev[i];
    if (existing) {
      next.push({
        unitType: existing.unitType,
        toilets: Math.max(0, Math.floor(existing.toilets)),
      });
    } else {
      const unit = prev[prev.length - 1]?.unitType ?? fallbackUnit;
      next.push({ unitType: unit, toilets: defaultToiletsForUnit(unit) });
    }
  }
  return next;
}

export function floorLabel(index: number, totalFloors: number): string {
  if (totalFloors <= 1) return 'Ground floor';
  if (index === 0) return 'Ground floor';
  if (index === 1) return '1st floor';
  if (index === 2) return '2nd floor';
  if (index === 3) return '3rd floor';
  return `${index + 1}th floor`;
}

export interface EstimateInputs {
  floors: number;
  /**
   * Per-floor BHK + toilet count (length must match `floors`).
   * Plumbing & interior walls use these — toilets are never inferred from BHK alone.
   */
  floorConfigs: FloorConfig[];
  /** @deprecated Prefer floorConfigs — kept as ground-floor mirror for labels. */
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

/**
 * Room-partition centreline length (ft) per floor by BHK — excludes toilet boxes.
 * Toilet walls are added separately from the floor's toilet count.
 */
export const INTERIOR_ROOM_WALL_LENGTH_FT: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 22,
  '2BHK': 38,
  '3BHK': 52,
  '4BHK': 68,
};

/** @deprecated Use INTERIOR_ROOM_WALL_LENGTH_FT + toilet walls. */
export const INTERIOR_WALL_LENGTH_FT_PER_FLOOR: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 30,
  '2BHK': 50,
  '3BHK': 70,
  '4BHK': 95,
};

/** Approx centreline of one toilet/bath enclosure (ft). */
export const TOILET_WALL_LENGTH_FT = 14;

export const BAR_DIAMETERS: BarDiameter[] = [8, 10, 12, 16, 20, 25, 32];
export const STIRRUP_DIAMETERS: BarDiameter[] = [6, 8];

export const MIX_RATIOS: Record<MixGrade, { cement: number; sand: number; aggregate: number; label: string }> = {
  M15: { cement: 1, sand: 2, aggregate: 4, label: 'M15 (1:2:4)' },
  M20: { cement: 1, sand: 1.5, aggregate: 3, label: 'M20 (1:1.5:3)' },
  M25: { cement: 1, sand: 1, aggregate: 2, label: 'M25 (1:1:2)' },
};

export const DEFAULT_INPUTS: EstimateInputs = {
  floors: 2,
  floorConfigs: [
    { unitType: '2BHK', toilets: DEFAULT_TOILETS_FOR_UNIT['2BHK'] },
    { unitType: '2BHK', toilets: DEFAULT_TOILETS_FOR_UNIT['2BHK'] },
  ],
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

// ── Assam Type (modern: RCC frame + 5″ brick + tin roof / truss) ──

export interface AssamItemRates {
  mistriPerSqft: number;
  cementPerBag: number;
  sandPerCum: number;
  brickPerPiece: number;
  aggregatePerCum: number;
  /** ₹ / quintal by bar diameter (mm). */
  steelPerQuintalByDia: Partial<Record<BarDiameter, number>>;
  /** Quality tin — Dyna / coloured Tata CGI — ₹ / sqft laid. */
  tinRoofPerSqft: number;
  /** Timber truss — ₹ / cft (used when truss = timber). */
  timberPerCft: number;
  flooringFinish: FlooringFinish;
}

export const DEFAULT_ASSAM_ITEM_RATES: AssamItemRates = {
  mistriPerSqft: 220,
  cementPerBag: 400,
  sandPerCum: 3200,
  brickPerPiece: 10,
  aggregatePerCum: 2500,
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
  tinRoofPerSqft: 95,
  timberPerCft: 1000,
  flooringFinish: 'tile',
};

/**
 * Modern Assam Type — single storey only.
 * Like RCC ground floor but no slab / floor beams; tin roof + trusses instead.
 */
export interface AssamEstimateInputs {
  unitType: UnitType;
  builtUpAreaSqft: number;
  foundationDepthFt: number;
  plinthHeightFt: number;
  /** Floor to eaves / wall top (single storey). */
  wallHeightFt: number;
  wastagePercent: WastagePercent;
  mixGrade: MixGrade;
  trussType: AssamTrussType;

  columnCount: number;
  columnWidthMm: number;
  columnDepthMm: number;
  columnRodsCount1: number;
  columnRodDia1Mm: BarDiameter;
  columnRodsCount2: number;
  columnRodDia2Mm: BarDiameter;
  columnStirrupDiaMm: BarDiameter;

  /** Plinth / ground beams only (no floor beams). */
  plinthBeamCount: number;
  plinthBeamWidthMm: number;
  plinthBeamDepthMm: number;
  avgPlinthBeamLengthFt: number;
  plinthBeamRodsCount1: number;
  plinthBeamRodDia1Mm: BarDiameter;
  plinthBeamRodsCount2: number;
  plinthBeamRodDia2Mm: BarDiameter;
  plinthBeamStirrupDiaMm: BarDiameter;

  footingType: FootingType;
  footingLengthMm: number;
  footingWidthMm: number;
  footingDepthMm: number;
  footingRodDiaMm: BarDiameter;

  /** Truss spacing along building length. */
  trussSpacingFt: number;
  /** Sloping tin area / plan area. */
  tinPitchFactor: number;
  tinWastagePercent: number;

  rates: AssamItemRates;
}

export const DEFAULT_ASSAM_INPUTS: AssamEstimateInputs = {
  unitType: '2BHK',
  builtUpAreaSqft: UNIT_TYPE_DEFAULT_AREA['2BHK'],
  foundationDepthFt: 4,
  plinthHeightFt: 2,
  wallHeightFt: 10,
  wastagePercent: 5,
  mixGrade: 'M20',
  trussType: 'rcc_king_post',

  columnCount: 12,
  columnWidthMm: 300,
  columnDepthMm: 300,
  columnRodsCount1: 4,
  columnRodDia1Mm: 16,
  columnRodsCount2: 4,
  columnRodDia2Mm: 12,
  columnStirrupDiaMm: 8,

  plinthBeamCount: 16,
  plinthBeamWidthMm: 230,
  plinthBeamDepthMm: 300,
  avgPlinthBeamLengthFt: 12,
  plinthBeamRodsCount1: 2,
  plinthBeamRodDia1Mm: 16,
  plinthBeamRodsCount2: 2,
  plinthBeamRodDia2Mm: 12,
  plinthBeamStirrupDiaMm: 8,

  footingType: 'isolated',
  footingLengthMm: 1200,
  footingWidthMm: 1200,
  footingDepthMm: 300,
  footingRodDiaMm: 12,

  trussSpacingFt: 10,
  tinPitchFactor: 1.2,
  tinWastagePercent: 10,

  rates: {
    ...DEFAULT_ASSAM_ITEM_RATES,
    steelPerQuintalByDia: { ...DEFAULT_ASSAM_ITEM_RATES.steelPerQuintalByDia },
  },
};

export interface AssamEstimateResults {
  concreteVolumeCum: {
    columns: number;
    plinthBeams: number;
    lintels: number;
    footings: number;
    /** RCC king-post trusses only; 0 for timber. */
    trusses: number;
    total: number;
  };
  cementBags: number;
  sandCum: number;
  aggregateCum: number;
  bricks: number;
  steelByDiameter: SteelByDiameter[];
  totalSteelQuintals: number;
  timberCft: number;
  tinRoofAreaSqft: number;
  plasterAreaSqft: number;
  wastagePercent: WastagePercent;
  meta: {
    builtUpAreaSqft: number;
    exteriorPerimeterFt: number;
    interiorWallLengthFt: number;
    wallAreaSqft: number;
    exteriorWallAreaSqft: number;
    interiorWallAreaSqft: number;
    footingCount: number;
    totalColumnHeightFt: number;
    lintelLengthFt: number;
    plinthBeamCount: number;
    trussType: AssamTrussType;
    trussCount: number;
    trussSpanFt: number;
    roofPlanSqft: number;
    tinPitchFactor: number;
    cementBagsRcc: number;
    cementBagsBrickMortar: number;
    cementBagsPlaster: number;
    bricksWalls: number;
    bricksFoundationSoling: number;
    bricksFlooring: number;
    standardSpacingMm: number;
    lapMultiplier: number;
  };
}

export interface EstimateResults {
  concreteVolumeCum: {
    columns: number;
    /** Floor / slab beams only. */
    beams: number;
    /** Continuous lintel / band beam (auto). */
    lintels: number;
    /** Ground / plinth beam — same package as floor beams (auto). */
    plinthBeams: number;
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
    /** Total wall centreline length for lintels (ext + int) × floors. */
    lintelLengthFt: number;
    /** Plinth beam count (= floor beam count). */
    plinthBeamCount: number;
    cementBagsRcc: number;
    cementBagsBrickMortar: number;
    cementBagsPlaster: number;
    bricksWalls: number;
    bricksFoundationSoling: number;
    bricksFlooring: number;
    staircaseAreaSqft: number;
    standardSpacingMm: number;
    lapMultiplier: number;
    /** Sum of user-entered toilets across floors. */
    totalToilets: number;
    /** One kitchen assumed per floor dwelling. */
    kitchenCount: number;
    /** Interior wall centreline total (all floors), ft. */
    interiorWallLengthFt: number;
  };
}
