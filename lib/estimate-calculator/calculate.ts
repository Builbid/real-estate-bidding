// ============================================================
// Construction Material Estimate — Indian QTO / estimation engine
// Uses IS-practice thumb rules + geometric formulas for budgeting.
// NOT a substitute for structural design drawings.
// ============================================================

import {
  INTERIOR_ROOM_WALL_LENGTH_FT,
  INTERIOR_WALL_LENGTH_FT_PER_FLOOR,
  LAP_LENGTH_MULTIPLIER,
  MIX_RATIOS,
  STANDARD_BAR_SPACING_MM,
  TOILET_WALL_LENGTH_FT,
  syncFloorConfigs,
  type BarDiameter,
  type EstimateInputs,
  type EstimateResults,
  type FloorConfig,
  type SteelByDiameter,
  type UnitType,
} from './types';

/**
 * Continuous lintel / seismic band — Assam residential standard.
 * Size 230×150 mm; 2×12 mm bottom + 2×8 mm top; 6 mm stirrups @ 125 mm.
 */
export const LINTEL_STANDARD = {
  widthMm: 230,
  depthMm: 150,
  bottomBars: 2,
  bottomDiaMm: 12 as BarDiameter,
  topBars: 2,
  topDiaMm: 8 as BarDiameter,
  stirrupDiaMm: 6 as BarDiameter,
} as const;

const SQFT_TO_SQM = 0.092903;
const FT_TO_M = 0.3048;

/** Wet→dry for concrete (voids + bulking) — DSR / Indian estimation. */
const DRY_VOLUME_FACTOR = 1.54;
/** Wet→dry for mortar & plaster. */
const MORTAR_DRY_VOLUME_FACTOR = 1.33;
const CEMENT_BAG_CUM = 0.0347;

/**
 * Modular brick + 10 mm joint ≈ 0.002 cum each → ~500 bricks / cum
 * (standard Indian estimation constant).
 */
const BRICK_WITH_MORTAR_CUM = 0.002;

/** Mortar wet volume ≈ 25–30% of brickwork volume for 1:6 masonry. */
const BRICK_MORTAR_WET_FRACTION = 0.30;
const BRICK_MORTAR_CEMENT_PARTS = 1;
const BRICK_MORTAR_SAND_PARTS = 6;

const PLASTER_THICKNESS_M = 0.012; // 12 mm
const PLASTER_CEMENT_PARTS = 1;
const PLASTER_SAND_PARTS = 4;

/** Clear cover (IS 456 typical residential). */
const COVER_COLUMN_MM = 40;
const COVER_BEAM_MM = 25;

/** Flat brick soling / flooring bed ≈ 75 mm. */
const BRICK_SOLING_THICKNESS_M = 0.075;

/** Dog-legged stair plan area per storey (flights + landing). */
const STAIR_AREA_SQFT_PER_FLOOR = 120;
const STAIR_THICKNESS_MM = 150;

/**
 * Stair steel density (kg/cum) — stairs usually denser than slabs
 * due to inclined waist + landing bars (estimation range 120–150).
 */
const STAIR_STEEL_KG_PER_CUM = 130;

const WALL_THICKNESS_M: Record<'4.5' | '9', number> = {
  '4.5': 0.1143,
  '9': 0.2286,
};
const INTERIOR_WALL_THICKNESS_M = WALL_THICKNESS_M['4.5'];

function barWeightKg(diameterMm: number, lengthM: number): number {
  if (lengthM <= 0 || diameterMm <= 0) return 0;
  // W (kg) = (d² / 162) × L(m) — from density 7850 kg/m³
  return ((diameterMm * diameterMm) / 162) * lengthM;
}

function lapLengthM(diameterMm: number): number {
  return (LAP_LENGTH_MULTIPLIER * diameterMm) / 1000;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function applyWastage(value: number, wastagePercent: number): number {
  return value * (1 + wastagePercent / 100);
}

function bagsFromCementVolume(cum: number): number {
  if (cum <= 0) return 0;
  return Math.ceil(cum / CEMENT_BAG_CUM);
}

function mortarCementAndSand(
  wetVolumeCum: number,
  cementParts: number,
  sandParts: number,
): { cementCum: number; sandCum: number } {
  if (wetVolumeCum <= 0) return { cementCum: 0, sandCum: 0 };
  const dry = wetVolumeCum * MORTAR_DRY_VOLUME_FACTOR;
  const parts = cementParts + sandParts;
  return {
    cementCum: dry * (cementParts / parts),
    sandCum: dry * (sandParts / parts),
  };
}

/**
 * Stirrup / ring cutting length (m):
 *   2 × (clear width + clear depth) + 2 × hooks
 * Clear dims = overall − 2 × cover; hook ≈ max(75 mm, 10d) — IS practice.
 */
function stirrupCuttingLengthM(
  widthMm: number,
  depthMm: number,
  coverMm: number,
  stirrupDiaMm: number,
): number {
  const clearW = Math.max(0, widthMm - 2 * coverMm);
  const clearD = Math.max(0, depthMm - 2 * coverMm);
  const hookMm = Math.max(75, 10 * stirrupDiaMm);
  return (2 * (clearW + clearD) + 2 * hookMm) / 1000;
}

/**
 * One-way slab steel intensity (kg/sqm) at given dia & spacing:
 *   bars per metre width = 1000 / spacing(mm)
 *   kg/sqm = (d²/162) × (1000/spacing)
 */
function slabSteelKgPerSqm(diaMm: number, spacingMm: number): number {
  if (diaMm <= 0 || spacingMm <= 0) return 0;
  return ((diaMm * diaMm) / 162) * (1000 / spacingMm);
}

/** Total slab plan area = slab area per floor × floors. */
export function getTotalSlabAreaSqft(inputs: EstimateInputs): number {
  return Math.max(0, inputs.slabAreaPerFloorSqft) * Math.max(0, inputs.floors);
}

/** @deprecated alias — prefer getTotalSlabAreaSqft */
export function getAutoSlabAreaSqft(inputs: EstimateInputs): number {
  return getTotalSlabAreaSqft(inputs);
}

/** Exterior wall face from built-up footprint (not slab area). Includes plinth band. */
export function getExteriorWallPerimeterFt(inputs: EstimateInputs): number {
  const area = Math.max(0, inputs.builtUpAreaPerFloorSqft);
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

/** Superstructure exterior (above plinth) — openings allowance 0.8. */
export function getSuperstructureExteriorWallAreaSqft(inputs: EstimateInputs): number {
  const perimeterFt = getExteriorWallPerimeterFt(inputs);
  if (perimeterFt <= 0 || inputs.floors <= 0 || inputs.floorToFloorHeightFt <= 0) return 0;
  return perimeterFt * inputs.floorToFloorHeightFt * inputs.floors * 0.8;
}

/** Ground-to-plinth exterior band — full brick, typically no large openings. */
export function getPlinthExteriorWallAreaSqft(inputs: EstimateInputs): number {
  const perimeterFt = getExteriorWallPerimeterFt(inputs);
  if (perimeterFt <= 0 || inputs.plinthHeightFt <= 0) return 0;
  return perimeterFt * Math.max(0, inputs.plinthHeightFt);
}

export function getExteriorWallAreaSqft(inputs: EstimateInputs): number {
  return getSuperstructureExteriorWallAreaSqft(inputs) + getPlinthExteriorWallAreaSqft(inputs);
}

/**
 * Footing jali bars one way: (dimension / spacing) + 1 @ standard 125 mm c/c.
 */
export function getFootingBarsAlong(dimensionMm: number, spacingMm = STANDARD_BAR_SPACING_MM): number {
  if (dimensionMm <= 0 || spacingMm <= 0) return 0;
  return Math.floor(dimensionMm / spacingMm) + 1;
}

/** Ensure floorConfigs length matches floors (safe for older state). */
export function getFloorConfigs(inputs: EstimateInputs): FloorConfig[] {
  return syncFloorConfigs(
    inputs.floors,
    inputs.floorConfigs ?? [],
    inputs.unitType ?? '2BHK',
  );
}

export function getTotalToilets(inputs: EstimateInputs): number {
  return getFloorConfigs(inputs).reduce((s, f) => s + Math.max(0, Math.floor(f.toilets)), 0);
}

/** One kitchen per floor (each storey treated as a dwelling unit). */
export function getKitchenCount(inputs: EstimateInputs): number {
  return Math.max(1, Math.floor(inputs.floors));
}

/**
 * Interior wall centreline for one floor:
 * room partitions (by BHK) + toilet enclosures (by toilet count — not assumed from BHK).
 */
export function getInteriorWallLengthFtForFloorConfig(
  config: FloorConfig,
  builtUpSqft: number,
): number {
  const toilets = Math.max(0, Math.floor(config.toilets));
  const toiletWalls = toilets * TOILET_WALL_LENGTH_FT;
  if (config.unitType !== 'Custom') {
    return INTERIOR_ROOM_WALL_LENGTH_FT[config.unitType] + toiletWalls;
  }
  // Custom: scale room partitions with built-up, plus toilet boxes
  return Math.max(0, builtUpSqft) * 0.035 + toiletWalls;
}

/** @deprecated Prefer getInteriorWallLengthFtForFloorConfig / getTotalInteriorWallLengthFt */
export function getInteriorWallLengthFtPerFloor(unitType: UnitType, builtUpSqft: number): number {
  if (unitType !== 'Custom') return INTERIOR_WALL_LENGTH_FT_PER_FLOOR[unitType];
  return Math.max(0, builtUpSqft) * 0.045;
}

/** Sum of interior wall centreline over all floors (ft). */
export function getTotalInteriorWallLengthFt(inputs: EstimateInputs): number {
  const configs = getFloorConfigs(inputs);
  const builtUp = Math.max(0, inputs.builtUpAreaPerFloorSqft);
  return configs.reduce(
    (sum, cfg) => sum + getInteriorWallLengthFtForFloorConfig(cfg, builtUp),
    0,
  );
}

/**
 * Continuous lintel band length = exterior perimeter × floors + interior walls (all floors).
 */
export function getLintelLengthFt(inputs: EstimateInputs): number {
  const floors = Math.max(0, inputs.floors);
  const exterior = getExteriorWallPerimeterFt(inputs) * floors;
  return exterior + getTotalInteriorWallLengthFt(inputs);
}

export function getInteriorWallAreaSqft(inputs: EstimateInputs): number {
  if (inputs.floors <= 0 || inputs.floorToFloorHeightFt <= 0) return 0;
  const lengthFt = getTotalInteriorWallLengthFt(inputs);
  // Slightly lower openings on toilet walls already baked into length; 0.88 overall
  return lengthFt * inputs.floorToFloorHeightFt * 0.88;
}

export function getAutoWallAreaSqft(inputs: EstimateInputs): number {
  return getExteriorWallAreaSqft(inputs) + getInteriorWallAreaSqft(inputs);
}

export function getFootingCount(inputs: EstimateInputs): number {
  const cols = Math.max(0, Math.floor(inputs.columnCount));
  if (cols === 0) return 0;
  if (inputs.footingType === 'combined') return Math.ceil(cols / 2);
  return cols;
}

export function getTotalColumnHeightFt(inputs: EstimateInputs): number {
  const floors = Math.max(0, inputs.floors);
  return (
    Math.max(0, inputs.foundationDepthFt) +
    Math.max(0, inputs.plinthHeightFt) +
    Math.max(0, inputs.floorToFloorHeightFt) * floors
  );
}

/** Column bar CL = height + footing development (50d) + storey laps (50d × floors). */
function columnBarCuttingLengthM(totalColumnHeightM: number, floors: number, diaMm: number): number {
  const Ld = lapLengthM(diaMm);
  return Math.max(0, totalColumnHeightM) + Ld + Math.max(0, floors) * Ld;
}

/** Beam bar CL = span + 2× end development (50d) + mid lap if span > 10 m. */
function beamBarCuttingLengthM(avgBeamLengthM: number, diaMm: number): number {
  const Ld = lapLengthM(diaMm);
  const midLap = avgBeamLengthM > 10 ? Ld : 0;
  return Math.max(0, avgBeamLengthM) + 2 * Ld + midLap;
}

export function calculateEstimate(inputs: EstimateInputs): EstimateResults {
  const floors = Math.max(0, inputs.floors);
  const columns = Math.max(0, Math.floor(inputs.columnCount));
  const beams = Math.max(0, Math.floor(inputs.beamCount));
  const footingCount = getFootingCount(inputs);
  const spacingMm = STANDARD_BAR_SPACING_MM;

  const totalColumnHeightM = getTotalColumnHeightFt(inputs) * FT_TO_M;

  // Slab uses dedicated slab area (NOT built-up).
  const slabAreaSqft = getTotalSlabAreaSqft(inputs);

  const wallAreaAutoEstimated =
    inputs.wallAreaSqftOverride == null || inputs.wallAreaSqftOverride <= 0;
  const exteriorWallAreaSqft = wallAreaAutoEstimated ? getExteriorWallAreaSqft(inputs) : 0;
  const interiorWallAreaSqft = wallAreaAutoEstimated ? getInteriorWallAreaSqft(inputs) : 0;
  const wallAreaSqft = wallAreaAutoEstimated
    ? exteriorWallAreaSqft + interiorWallAreaSqft
    : inputs.wallAreaSqftOverride!;

  // ── Concrete ────────────────────────────────────────────────
  const colW = inputs.columnWidthMm / 1000;
  const colD = inputs.columnDepthMm / 1000;
  const columnConcrete = colW * colD * Math.max(0, totalColumnHeightM) * columns;

  const beamW = inputs.beamWidthMm / 1000;
  const beamD = inputs.beamDepthMm / 1000;
  const avgBeamLengthM = inputs.avgBeamLengthFt * FT_TO_M;
  const beamConcrete = beamW * beamD * Math.max(0, avgBeamLengthM) * beams;

  // Ground / plinth beam — same size, length & count as floor/slab beams (one level).
  const plinthBeamCount = beams;
  const plinthBeamConcrete = beamW * beamD * Math.max(0, avgBeamLengthM) * plinthBeamCount;

  // Continuous lintel band — length = total wall length (ext + int) × floors.
  const lintelLengthFt = getLintelLengthFt(inputs);
  const lintelLengthM = lintelLengthFt * FT_TO_M;
  const lintelConcrete =
    (LINTEL_STANDARD.widthMm / 1000) *
    (LINTEL_STANDARD.depthMm / 1000) *
    Math.max(0, lintelLengthM);

  const footConcrete =
    (inputs.footingLengthMm / 1000) *
    (inputs.footingWidthMm / 1000) *
    (inputs.footingDepthMm / 1000) *
    footingCount;

  const slabAreaSqm = slabAreaSqft * SQFT_TO_SQM;
  const slabConcrete = slabAreaSqm * Math.max(0, inputs.slabThicknessMm / 1000);

  const staircaseAreaSqft = STAIR_AREA_SQFT_PER_FLOOR * Math.max(0, floors);
  const staircaseConcrete =
    staircaseAreaSqft * SQFT_TO_SQM * (STAIR_THICKNESS_MM / 1000);

  const totalConcrete =
    columnConcrete +
    beamConcrete +
    plinthBeamConcrete +
    lintelConcrete +
    footConcrete +
    slabConcrete +
    staircaseConcrete;

  // ── RCC cement / sand / aggregate ───────────────────────────
  const ratio = MIX_RATIOS[inputs.mixGrade];
  const partsSum = ratio.cement + ratio.sand + ratio.aggregate;
  const dryVolume = totalConcrete * DRY_VOLUME_FACTOR;
  const rccCementCum = dryVolume * (ratio.cement / partsSum);
  const rccSandCum = dryVolume * (ratio.sand / partsSum);
  const aggregateCumRaw = dryVolume * (ratio.aggregate / partsSum);
  const cementBagsRcc = bagsFromCementVolume(rccCementCum);

  // ── Steel ───────────────────────────────────────────────────
  const steelKg = new Map<number, number>();
  function addSteel(diaMm: number, kg: number) {
    if (kg <= 0 || diaMm <= 0) return;
    steelKg.set(diaMm, (steelKg.get(diaMm) ?? 0) + kg);
  }

  const colSets = [
    { count: Math.max(0, Math.floor(inputs.columnRodsCount1)), dia: inputs.columnRodDia1Mm },
    { count: Math.max(0, Math.floor(inputs.columnRodsCount2)), dia: inputs.columnRodDia2Mm },
  ];
  for (const set of colSets) {
    if (set.count === 0) continue;
    const lenOne = columnBarCuttingLengthM(totalColumnHeightM, floors, set.dia);
    addSteel(set.dia, barWeightKg(set.dia, columns * set.count * lenOne));
  }

  if (columns > 0 && totalColumnHeightM > 0) {
    const stirrupsPerCol = Math.ceil((totalColumnHeightM * 1000) / spacingMm);
    const stirrupLenM = stirrupCuttingLengthM(
      inputs.columnWidthMm,
      inputs.columnDepthMm,
      COVER_COLUMN_MM,
      inputs.columnStirrupDiaMm,
    );
    addSteel(
      inputs.columnStirrupDiaMm,
      barWeightKg(inputs.columnStirrupDiaMm, stirrupsPerCol * stirrupLenM * columns),
    );
  }

  const beamSets = [
    { count: Math.max(0, Math.floor(inputs.beamRodsCount1)), dia: inputs.beamRodDia1Mm },
    { count: Math.max(0, Math.floor(inputs.beamRodsCount2)), dia: inputs.beamRodDia2Mm },
  ];
  // Floor/slab beams + matching ground/plinth beams (same bars × same count).
  const beamMembersForSteel = beams + plinthBeamCount;
  for (const set of beamSets) {
    if (set.count === 0) continue;
    const lenOne = beamBarCuttingLengthM(avgBeamLengthM, set.dia);
    addSteel(set.dia, barWeightKg(set.dia, beamMembersForSteel * set.count * lenOne));
  }

  if (beamMembersForSteel > 0 && avgBeamLengthM > 0) {
    const stirrupsPerBeam = Math.ceil((avgBeamLengthM * 1000) / spacingMm);
    const stirrupLenM = stirrupCuttingLengthM(
      inputs.beamWidthMm,
      inputs.beamDepthMm,
      COVER_BEAM_MM,
      inputs.beamStirrupDiaMm,
    );
    addSteel(
      inputs.beamStirrupDiaMm,
      barWeightKg(inputs.beamStirrupDiaMm, stirrupsPerBeam * stirrupLenM * beamMembersForSteel),
    );
  }

  // Lintel band steel — continuous length with standard bar schedule.
  if (lintelLengthM > 0) {
    const lintelLdBottom = lapLengthM(LINTEL_STANDARD.bottomDiaMm);
    const lintelLdTop = lapLengthM(LINTEL_STANDARD.topDiaMm);
    // Development / laps: ~1 lap per ~6 m of continuous band (estimation).
    const lapCount = Math.max(1, Math.ceil(lintelLengthM / 6));
    const bottomClM = lintelLengthM + lapCount * lintelLdBottom;
    const topClM = lintelLengthM + lapCount * lintelLdTop;
    addSteel(
      LINTEL_STANDARD.bottomDiaMm,
      barWeightKg(LINTEL_STANDARD.bottomDiaMm, LINTEL_STANDARD.bottomBars * bottomClM),
    );
    addSteel(
      LINTEL_STANDARD.topDiaMm,
      barWeightKg(LINTEL_STANDARD.topDiaMm, LINTEL_STANDARD.topBars * topClM),
    );
    const lintelStirrups = Math.ceil((lintelLengthM * 1000) / spacingMm);
    const lintelStirrupLenM = stirrupCuttingLengthM(
      LINTEL_STANDARD.widthMm,
      LINTEL_STANDARD.depthMm,
      COVER_BEAM_MM,
      LINTEL_STANDARD.stirrupDiaMm,
    );
    addSteel(
      LINTEL_STANDARD.stirrupDiaMm,
      barWeightKg(LINTEL_STANDARD.stirrupDiaMm, lintelStirrups * lintelStirrupLenM),
    );
  }

  if (footingCount > 0) {
    // Two-way footing jali @ 125 mm: bars along each side = (perp. dim / spacing) + 1
    const barsAlongLength = getFootingBarsAlong(inputs.footingWidthMm, spacingMm);
    const barsAlongWidth = getFootingBarsAlong(inputs.footingLengthMm, spacingMm);
    const Ld = lapLengthM(inputs.footingRodDiaMm);
    const lenAlongLengthM = inputs.footingLengthMm / 1000 + Ld;
    const lenAlongWidthM = inputs.footingWidthMm / 1000 + Ld;
    const totalLengthM =
      footingCount * (barsAlongLength * lenAlongLengthM + barsAlongWidth * lenAlongWidthM);
    addSteel(
      inputs.footingRodDiaMm,
      barWeightKg(inputs.footingRodDiaMm, totalLengthM),
    );
  }

  // Slab steel from bar formula (main + distribution) @ 125 mm c/c — more accurate than kg/cum.
  // Add ~10% for crank / bent-up / extras (common QTO allowance).
  const SLAB_EXTRA = 1.1;
  const mainKgPerSqm = slabSteelKgPerSqm(inputs.slabMainDiaMm, spacingMm);
  const distKgPerSqm = slabSteelKgPerSqm(inputs.slabDistDiaMm, spacingMm);
  addSteel(inputs.slabMainDiaMm, mainKgPerSqm * slabAreaSqm * SLAB_EXTRA);
  addSteel(inputs.slabDistDiaMm, distKgPerSqm * slabAreaSqm * SLAB_EXTRA);

  // Staircase steel (higher density than flat slab)
  addSteel(inputs.slabMainDiaMm, staircaseConcrete * STAIR_STEEL_KG_PER_CUM);

  const wastage = inputs.wastagePercent;
  const steelByDiameter: SteelByDiameter[] = Array.from(steelKg.entries())
    .map(([diameterMm, kg]) => {
      const withWaste = applyWastage(kg, wastage);
      return {
        diameterMm,
        kg: round2(withWaste),
        quintals: round2(withWaste / 100),
      };
    })
    .filter((row) => row.quintals > 0)
    .sort((a, b) => a.diameterMm - b.diameterMm);

  const totalSteelKg = steelByDiameter.reduce((s, r) => s + r.kg, 0);

  // ── Bricks ──────────────────────────────────────────────────
  // Plinth (GL → plinth) exterior always full brick 9"; above-plinth uses selected thickness.
  const exteriorThickM = WALL_THICKNESS_M[inputs.wallThickness];
  const plinthThickM = WALL_THICKNESS_M['9'];
  let wallBrickworkCum = 0;
  if (wallAreaAutoEstimated) {
    const superExtSqft = getSuperstructureExteriorWallAreaSqft(inputs);
    const plinthExtSqft = getPlinthExteriorWallAreaSqft(inputs);
    wallBrickworkCum =
      superExtSqft * SQFT_TO_SQM * exteriorThickM +
      plinthExtSqft * SQFT_TO_SQM * plinthThickM +
      interiorWallAreaSqft * SQFT_TO_SQM * INTERIOR_WALL_THICKNESS_M;
  } else {
    wallBrickworkCum = wallAreaSqft * SQFT_TO_SQM * exteriorThickM;
  }
  const bricksWallsRaw = Math.ceil(wallBrickworkCum / BRICK_WITH_MORTAR_CUM);

  // Foundation brick soling under footings (uses footing plan, not built-up)
  const footingPlanSqm =
    footingCount *
    (inputs.footingLengthMm / 1000) *
    (inputs.footingWidthMm / 1000);
  const foundationSolingCum = footingPlanSqm * BRICK_SOLING_THICKNESS_M;
  const bricksFoundationRaw = Math.ceil(foundationSolingCum / BRICK_WITH_MORTAR_CUM);

  // Flooring brick bed under built-up (carpet/floor finish base) — uses built-up, not slab
  const flooringPlanSqm =
    Math.max(0, inputs.builtUpAreaPerFloorSqft) * Math.max(0, floors) * SQFT_TO_SQM;
  const flooringSolingCum = flooringPlanSqm * BRICK_SOLING_THICKNESS_M;
  const bricksFlooringRaw = Math.ceil(flooringSolingCum / BRICK_WITH_MORTAR_CUM);

  const totalBrickworkCum = wallBrickworkCum + foundationSolingCum + flooringSolingCum;
  const bricksRaw = bricksWallsRaw + bricksFoundationRaw + bricksFlooringRaw;
  const bricks = Math.ceil(applyWastage(bricksRaw, wastage));

  const brickMortar = mortarCementAndSand(
    totalBrickworkCum * BRICK_MORTAR_WET_FRACTION,
    BRICK_MORTAR_CEMENT_PARTS,
    BRICK_MORTAR_SAND_PARTS,
  );
  const cementBagsBrickMortar = bagsFromCementVolume(brickMortar.cementCum);

  // Wall plaster both faces + ceiling plaster on slab soffit (uses slab area)
  const wallPlasterSqm = wallAreaSqft * SQFT_TO_SQM * 2;
  const ceilingPlasterSqm = slabAreaSqm; // soffit of floor/roof slabs
  const plaster = mortarCementAndSand(
    (wallPlasterSqm + ceilingPlasterSqm) * PLASTER_THICKNESS_M,
    PLASTER_CEMENT_PARTS,
    PLASTER_SAND_PARTS,
  );
  const cementBagsPlaster = bagsFromCementVolume(plaster.cementCum);

  const cementBagsRaw = cementBagsRcc + cementBagsBrickMortar + cementBagsPlaster;
  const sandCumRaw = rccSandCum + brickMortar.sandCum + plaster.sandCum;

  return {
    concreteVolumeCum: {
      columns: round2(columnConcrete),
      beams: round2(beamConcrete),
      lintels: round2(lintelConcrete),
      plinthBeams: round2(plinthBeamConcrete),
      footings: round2(footConcrete),
      slab: round2(slabConcrete),
      staircase: round2(staircaseConcrete),
      total: round2(totalConcrete),
    },
    cementBags: Math.ceil(applyWastage(cementBagsRaw, wastage)),
    sandCum: round2(applyWastage(sandCumRaw, wastage)),
    aggregateCum: round2(applyWastage(aggregateCumRaw, wastage)),
    bricks,
    steelByDiameter,
    totalSteelQuintals: round2(totalSteelKg / 100),
    wastagePercent: wastage,
    meta: {
      builtUpAreaPerFloorSqft: round1(inputs.builtUpAreaPerFloorSqft),
      slabAreaPerFloorSqft: round1(inputs.slabAreaPerFloorSqft),
      slabAreaSqft: round1(slabAreaSqft),
      wallAreaSqft: round1(wallAreaSqft),
      exteriorWallAreaSqft: round1(
        wallAreaAutoEstimated ? exteriorWallAreaSqft : wallAreaSqft,
      ),
      interiorWallAreaSqft: round1(wallAreaAutoEstimated ? interiorWallAreaSqft : 0),
      wallAreaAutoEstimated,
      footingCount,
      totalColumnHeightFt: round2(getTotalColumnHeightFt(inputs)),
      lintelLengthFt: round1(lintelLengthFt),
      plinthBeamCount,
      cementBagsRcc,
      cementBagsBrickMortar,
      cementBagsPlaster,
      bricksWalls: Math.ceil(applyWastage(bricksWallsRaw, wastage)),
      bricksFoundationSoling: Math.ceil(applyWastage(bricksFoundationRaw, wastage)),
      bricksFlooring: Math.ceil(applyWastage(bricksFlooringRaw, wastage)),
      staircaseAreaSqft: round1(staircaseAreaSqft),
      standardSpacingMm: spacingMm,
      lapMultiplier: LAP_LENGTH_MULTIPLIER,
      totalToilets: getTotalToilets(inputs),
      kitchenCount: getKitchenCount(inputs),
      interiorWallLengthFt: round1(getTotalInteriorWallLengthFt(inputs)),
    },
  };
}
