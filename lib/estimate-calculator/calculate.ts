// ============================================================
// Construction Material Estimate — Indian civil estimation engine
// Budgeting aid only — not structural design.
// ============================================================

import {
  INTERIOR_WALL_LENGTH_FT_PER_FLOOR,
  LAP_LENGTH_MULTIPLIER,
  MIX_RATIOS,
  STANDARD_BAR_SPACING_MM,
  type EstimateInputs,
  type EstimateResults,
  type SteelByDiameter,
  type UnitType,
} from './types';

const SQFT_TO_SQM = 0.092903;
const FT_TO_M = 0.3048;
const DRY_VOLUME_FACTOR = 1.54;
const MORTAR_DRY_VOLUME_FACTOR = 1.33;
const CEMENT_BAG_CUM = 0.0347;
const BRICK_WITH_MORTAR_CUM = 0.002;
const BRICK_MORTAR_WET_FRACTION = 0.30;
const BRICK_MORTAR_CEMENT_PARTS = 1;
const BRICK_MORTAR_SAND_PARTS = 6;
const PLASTER_THICKNESS_M = 0.012;
const PLASTER_CEMENT_PARTS = 1;
const PLASTER_SAND_PARTS = 4;
const SLAB_STEEL_KG_PER_CUM = 100;

/** Flat brick soling / flooring bed thickness ≈ 75 mm (one brick on flat). */
const BRICK_SOLING_THICKNESS_M = 0.075;

/**
 * Standard residential dog-legged stair plan area per storey (sqft).
 * Includes flights + mid-landing allowance for a typical house stair.
 */
const STAIR_AREA_SQFT_PER_FLOOR = 120;

/** Stair waist / landing slab thickness (mm). */
const STAIR_THICKNESS_MM = 150;

const WALL_THICKNESS_M: Record<'4.5' | '9', number> = {
  '4.5': 0.1143,
  '9': 0.2286,
};
const INTERIOR_WALL_THICKNESS_M = WALL_THICKNESS_M['4.5'];

function barWeightKg(diameterMm: number, lengthM: number): number {
  if (lengthM <= 0 || diameterMm <= 0) return 0;
  // Standard: W (kg) = (d² / 162) × L(m)
  return ((diameterMm * diameterMm) / 162) * lengthM;
}

/** Lap / development length in metres = 50 × d(mm) / 1000. */
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

export function getAutoSlabAreaSqft(inputs: EstimateInputs): number {
  return Math.max(0, inputs.builtUpAreaPerFloorSqft) * Math.max(0, inputs.floors);
}

export function getExteriorWallAreaSqft(inputs: EstimateInputs): number {
  const area = Math.max(0, inputs.builtUpAreaPerFloorSqft);
  if (area <= 0 || inputs.floors <= 0 || inputs.floorToFloorHeightFt <= 0) return 0;
  const sideFt = Math.sqrt(area);
  const perimeterFt = 4 * sideFt;
  return perimeterFt * inputs.floorToFloorHeightFt * inputs.floors * 0.8;
}

export function getInteriorWallLengthFtPerFloor(unitType: UnitType, builtUpSqft: number): number {
  if (unitType !== 'Custom') return INTERIOR_WALL_LENGTH_FT_PER_FLOOR[unitType];
  return Math.max(0, builtUpSqft) * 0.045;
}

export function getInteriorWallAreaSqft(inputs: EstimateInputs): number {
  if (inputs.floors <= 0 || inputs.floorToFloorHeightFt <= 0) return 0;
  const lengthFt = getInteriorWallLengthFtPerFloor(
    inputs.unitType,
    inputs.builtUpAreaPerFloorSqft,
  );
  return lengthFt * inputs.floorToFloorHeightFt * inputs.floors * 0.9;
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

/**
 * Cutting length of one main bar in a column (m):
 *   clear column height
 * + 1 × development into footing (50d)
 * + floors × lap at each storey splice (50d each)
 */
function columnBarCuttingLengthM(totalColumnHeightM: number, floors: number, diaMm: number): number {
  const Ld = lapLengthM(diaMm);
  return Math.max(0, totalColumnHeightM) + Ld + Math.max(0, floors) * Ld;
}

/**
 * Cutting length of one main bar in a beam (m):
 *   clear span
 * + 2 × development into supporting columns (50d each end)
 * + 1 lap if span > 10 m (long beam mid-splice)
 */
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

  const slabAreaSqft =
    inputs.slabAreaSqftOverride != null && inputs.slabAreaSqftOverride > 0
      ? inputs.slabAreaSqftOverride
      : getAutoSlabAreaSqft(inputs);

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

  const footConcrete =
    (inputs.footingLengthMm / 1000) *
    (inputs.footingWidthMm / 1000) *
    (inputs.footingDepthMm / 1000) *
    footingCount;

  const slabAreaSqm = slabAreaSqft * SQFT_TO_SQM;
  const slabConcrete = slabAreaSqm * Math.max(0, inputs.slabThicknessMm / 1000);

  // Staircase: one dog-leg stair core serving all floors
  const staircaseAreaSqft = STAIR_AREA_SQFT_PER_FLOOR * Math.max(0, floors);
  const staircaseConcrete =
    staircaseAreaSqft * SQFT_TO_SQM * (STAIR_THICKNESS_MM / 1000);

  const totalConcrete =
    columnConcrete + beamConcrete + footConcrete + slabConcrete + staircaseConcrete;

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

  // Column main bars — dual diameters, each with lap + development
  const colSets: { count: number; dia: number }[] = [
    { count: Math.max(0, Math.floor(inputs.columnRodsCount1)), dia: inputs.columnRodDia1Mm },
    { count: Math.max(0, Math.floor(inputs.columnRodsCount2)), dia: inputs.columnRodDia2Mm },
  ];
  for (const set of colSets) {
    if (set.count === 0) continue;
    const lenOne = columnBarCuttingLengthM(totalColumnHeightM, floors, set.dia);
    addSteel(set.dia, barWeightKg(set.dia, columns * set.count * lenOne));
  }

  // Column stirrups @ fixed 125 mm c/c
  if (columns > 0 && totalColumnHeightM > 0) {
    const stirrupsPerCol = Math.ceil((totalColumnHeightM * 1000) / spacingMm);
    const stirrupLenM =
      (2 * (inputs.columnWidthMm + inputs.columnDepthMm) + 100) / 1000;
    addSteel(
      inputs.columnStirrupDiaMm,
      barWeightKg(inputs.columnStirrupDiaMm, stirrupsPerCol * stirrupLenM * columns),
    );
  }

  // Beam main bars — dual diameters
  const beamSets: { count: number; dia: number }[] = [
    { count: Math.max(0, Math.floor(inputs.beamRodsCount1)), dia: inputs.beamRodDia1Mm },
    { count: Math.max(0, Math.floor(inputs.beamRodsCount2)), dia: inputs.beamRodDia2Mm },
  ];
  for (const set of beamSets) {
    if (set.count === 0) continue;
    const lenOne = beamBarCuttingLengthM(avgBeamLengthM, set.dia);
    addSteel(set.dia, barWeightKg(set.dia, beams * set.count * lenOne));
  }

  // Beam stirrups @ fixed 125 mm c/c
  if (beams > 0 && avgBeamLengthM > 0) {
    const stirrupsPerBeam = Math.ceil((avgBeamLengthM * 1000) / spacingMm);
    const stirrupLenM =
      (2 * (inputs.beamWidthMm + inputs.beamDepthMm) + 100) / 1000;
    addSteel(
      inputs.beamStirrupDiaMm,
      barWeightKg(inputs.beamStirrupDiaMm, stirrupsPerBeam * stirrupLenM * beams),
    );
  }

  // Footing two-way mesh + 50d development/anchorage allowance per rod (~10% via Ld on avg side)
  if (footingCount > 0 && inputs.rodsPerFootingOneWay > 0) {
    const avgSideM =
      ((inputs.footingLengthMm + inputs.footingWidthMm) / 2) / 1000;
    const Ld = lapLengthM(inputs.footingRodDiaMm);
    const lenOne = avgSideM + Ld; // anchorage beyond clear side
    const totalRods = footingCount * inputs.rodsPerFootingOneWay * 2;
    addSteel(
      inputs.footingRodDiaMm,
      barWeightKg(inputs.footingRodDiaMm, totalRods * lenOne),
    );
  }

  // Slab steel — 100 kg/cum; 70% main dia / 30% distribution dia for reporting
  const slabSteelKg = slabConcrete * SLAB_STEEL_KG_PER_CUM;
  addSteel(inputs.slabMainDiaMm, slabSteelKg * 0.7);
  addSteel(inputs.slabDistDiaMm, slabSteelKg * 0.3);

  // Staircase steel — same density as slab, attributed to slab main dia
  const stairSteelKg = staircaseConcrete * SLAB_STEEL_KG_PER_CUM;
  addSteel(inputs.slabMainDiaMm, stairSteelKg);

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

  // ── Wall bricks ─────────────────────────────────────────────
  const exteriorThickM = WALL_THICKNESS_M[inputs.wallThickness];
  let wallBrickworkCum = 0;
  if (wallAreaAutoEstimated) {
    wallBrickworkCum =
      exteriorWallAreaSqft * SQFT_TO_SQM * exteriorThickM +
      interiorWallAreaSqft * SQFT_TO_SQM * INTERIOR_WALL_THICKNESS_M;
  } else {
    wallBrickworkCum = wallAreaSqft * SQFT_TO_SQM * exteriorThickM;
  }
  const bricksWallsRaw = Math.ceil(wallBrickworkCum / BRICK_WITH_MORTAR_CUM);

  // Brick soling below footings (foundation bed)
  const footingPlanSqm =
    footingCount *
    (inputs.footingLengthMm / 1000) *
    (inputs.footingWidthMm / 1000);
  const foundationSolingCum = footingPlanSqm * BRICK_SOLING_THICKNESS_M;
  const bricksFoundationRaw = Math.ceil(foundationSolingCum / BRICK_WITH_MORTAR_CUM);

  // Brick soling / bed under flooring (each floor built-up)
  const flooringPlanSqm =
    Math.max(0, inputs.builtUpAreaPerFloorSqft) * Math.max(0, floors) * SQFT_TO_SQM;
  const flooringSolingCum = flooringPlanSqm * BRICK_SOLING_THICKNESS_M;
  const bricksFlooringRaw = Math.ceil(flooringSolingCum / BRICK_WITH_MORTAR_CUM);

  const totalBrickworkCum = wallBrickworkCum + foundationSolingCum + flooringSolingCum;
  const bricksRaw = bricksWallsRaw + bricksFoundationRaw + bricksFlooringRaw;
  const bricks = Math.ceil(applyWastage(bricksRaw, wastage));

  // Brick mortar (1:6) for walls + foundation soling + flooring bed
  const brickMortar = mortarCementAndSand(
    totalBrickworkCum * BRICK_MORTAR_WET_FRACTION,
    BRICK_MORTAR_CEMENT_PARTS,
    BRICK_MORTAR_SAND_PARTS,
  );
  const cementBagsBrickMortar = bagsFromCementVolume(brickMortar.cementCum);

  // Plaster both faces of walls only (not soling)
  const plasterAreaSqm = wallAreaSqft * SQFT_TO_SQM * 2;
  const plaster = mortarCementAndSand(
    plasterAreaSqm * PLASTER_THICKNESS_M,
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
      slabAreaSqft: round1(slabAreaSqft),
      wallAreaSqft: round1(wallAreaSqft),
      exteriorWallAreaSqft: round1(
        wallAreaAutoEstimated ? exteriorWallAreaSqft : wallAreaSqft,
      ),
      interiorWallAreaSqft: round1(wallAreaAutoEstimated ? interiorWallAreaSqft : 0),
      wallAreaAutoEstimated,
      footingCount,
      totalColumnHeightFt: round2(getTotalColumnHeightFt(inputs)),
      cementBagsRcc,
      cementBagsBrickMortar,
      cementBagsPlaster,
      bricksWalls: Math.ceil(applyWastage(bricksWallsRaw, wastage)),
      bricksFoundationSoling: Math.ceil(applyWastage(bricksFoundationRaw, wastage)),
      bricksFlooring: Math.ceil(applyWastage(bricksFlooringRaw, wastage)),
      staircaseAreaSqft: round1(staircaseAreaSqft),
      standardSpacingMm: spacingMm,
      lapMultiplier: LAP_LENGTH_MULTIPLIER,
    },
  };
}
