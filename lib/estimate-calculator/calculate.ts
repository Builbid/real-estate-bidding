// ============================================================
// Construction Material Estimate — Indian civil thumb-rule engine
//
// All formulas are approximate budgeting aids, NOT structural design.
// Each formula has an inline comment explaining the assumption so
// values can be tuned later against real project data.
// ============================================================

import {
  INTERIOR_WALL_LENGTH_FT_PER_FLOOR,
  MIX_RATIOS,
  type EstimateInputs,
  type EstimateResults,
  type SteelByDiameter,
  type UnitType,
} from './types';

/** 1 sq ft = 0.092903 sq m */
const SQFT_TO_SQM = 0.092903;
/** 1 ft = 0.3048 m */
const FT_TO_M = 0.3048;

/**
 * Dry volume factor: wet concrete volume × 1.54 ≈ dry volume of
 * cement+sand+aggregate. Standard Indian estimation factor that
 * accounts for voids and bulking (IS / DSR practice).
 */
const DRY_VOLUME_FACTOR = 1.54;

/**
 * Mortar / plaster dry-volume factor (≈1.33). Lower than concrete's 1.54
 * because mortar has less coarse aggregate voids — common Indian QTO practice.
 */
const MORTAR_DRY_VOLUME_FACTOR = 1.33;

/** Volume of one 50 kg cement bag ≈ 0.0347 cum. */
const CEMENT_BAG_CUM = 0.0347;

/**
 * Modular brick with 10 mm mortar joint occupies ≈ 0.002 cum.
 * Using this already includes joint size in the brick count —
 * separate cement for brickwork mortar is still added below for bag estimate.
 */
const BRICK_WITH_MORTAR_CUM = 0.002;

/**
 * Wet mortar volume as a fraction of brickwork volume (≈25–30% in Indian
 * estimation manuals). Used to size cement/sand for brick masonry (1:6).
 */
const BRICK_MORTAR_WET_FRACTION = 0.30;

/** Brick masonry mortar mix cement:sand = 1:6 (common for residential walls). */
const BRICK_MORTAR_CEMENT_PARTS = 1;
const BRICK_MORTAR_SAND_PARTS = 6;

/** Wall plaster thickness 12 mm — typical single-coat internal/external plaster. */
const PLASTER_THICKNESS_M = 0.012;

/** Plaster mix cement:sand = 1:4 (common wall plaster). */
const PLASTER_CEMENT_PARTS = 1;
const PLASTER_SAND_PARTS = 4;

/**
 * Thumb-rule slab steel density ≈ 100 kg per cum of slab concrete.
 * Preferred over spacing-based calc when span/support conditions
 * are unknown (more stable for rough residential budgeting).
 */
const SLAB_STEEL_KG_PER_CUM = 100;

/** Wall thickness conversions (inches → metres). Exterior uses user choice; interiors use 4.5". */
const WALL_THICKNESS_M: Record<'4.5' | '9', number> = {
  '4.5': 0.1143,
  '9': 0.2286,
};

/** Interior partitions are assumed half-brick (4.5") in standard BHK layouts. */
const INTERIOR_WALL_THICKNESS_M = WALL_THICKNESS_M['4.5'];

/**
 * Standard bar-weight formula used across India:
 *   weight (kg) = (d² / 162) × length (m)
 * where d = diameter in mm. Derived from steel density 7850 kg/m³.
 */
function barWeightKg(diameterMm: number, lengthM: number): number {
  if (lengthM <= 0 || diameterMm <= 0) return 0;
  return ((diameterMm * diameterMm) / 162) * lengthM;
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

/** Auto slab area = built-up per floor × number of floors. */
export function getAutoSlabAreaSqft(inputs: EstimateInputs): number {
  return Math.max(0, inputs.builtUpAreaPerFloorSqft) * Math.max(0, inputs.floors);
}

/**
 * Exterior wall face area (sqft) — one face:
 *   square footprint from built-up → perimeter × floor height × floors × 0.8
 * The 0.8 factor deducts typical door/window openings on outer walls.
 */
export function getExteriorWallAreaSqft(inputs: EstimateInputs): number {
  const area = Math.max(0, inputs.builtUpAreaPerFloorSqft);
  if (area <= 0 || inputs.floors <= 0 || inputs.floorToFloorHeightFt <= 0) return 0;
  const sideFt = Math.sqrt(area);
  const perimeterFt = 4 * sideFt;
  return perimeterFt * inputs.floorToFloorHeightFt * inputs.floors * 0.8;
}

/**
 * Standard interior partition running length (ft) for one floor from BHK type.
 * Custom: ≈ 0.045 × built-up (sqft) as a rough partition-length proxy.
 */
export function getInteriorWallLengthFtPerFloor(unitType: UnitType, builtUpSqft: number): number {
  if (unitType !== 'Custom') {
    return INTERIOR_WALL_LENGTH_FT_PER_FLOOR[unitType];
  }
  return Math.max(0, builtUpSqft) * 0.045;
}

/**
 * Interior room-wall face area (sqft) — one face:
 *   standard BHK partition length × floor height × floors × 0.9
 * (0.9 = light opening deduction for doors in partitions).
 */
export function getInteriorWallAreaSqft(inputs: EstimateInputs): number {
  if (inputs.floors <= 0 || inputs.floorToFloorHeightFt <= 0) return 0;
  const lengthFt = getInteriorWallLengthFtPerFloor(
    inputs.unitType,
    inputs.builtUpAreaPerFloorSqft,
  );
  return lengthFt * inputs.floorToFloorHeightFt * inputs.floors * 0.9;
}

/** Total one-face wall area = exterior + interior (auto path). */
export function getAutoWallAreaSqft(inputs: EstimateInputs): number {
  return getExteriorWallAreaSqft(inputs) + getInteriorWallAreaSqft(inputs);
}

/**
 * Isolated: one footing per column.
 * Combined: rough rule — one combined footing for every two columns
 * (ceil). Real combined footing layouts vary; this is only for budgeting.
 */
export function getFootingCount(inputs: EstimateInputs): number {
  const cols = Math.max(0, Math.floor(inputs.columnCount));
  if (cols === 0) return 0;
  if (inputs.footingType === 'combined') return Math.ceil(cols / 2);
  return cols;
}

/**
 * Total vertical column length used for concrete + steel (ft).
 * = foundation depth (below GL to footing top region) + plinth + (floor-to-floor × floors).
 * Deeper foundations increase column height (and steel/concrete) proportionally.
 */
export function getTotalColumnHeightFt(inputs: EstimateInputs): number {
  const floors = Math.max(0, inputs.floors);
  return (
    Math.max(0, inputs.foundationDepthFt) +
    Math.max(0, inputs.plinthHeightFt) +
    Math.max(0, inputs.floorToFloorHeightFt) * floors
  );
}

/** Cement volume (cum) and sand volume (cum) from wet mortar/plaster volume + mix parts. */
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

export function calculateEstimate(inputs: EstimateInputs): EstimateResults {
  const floors = Math.max(0, inputs.floors);
  const columns = Math.max(0, Math.floor(inputs.columnCount));
  const beams = Math.max(0, Math.floor(inputs.beamCount));
  const footingCount = getFootingCount(inputs);

  // Convert the same total height to metres for volume / bar-weight formulas.
  const totalColumnHeightM = getTotalColumnHeightFt(inputs) * FT_TO_M;

  const slabAreaSqft =
    inputs.slabAreaSqftOverride != null && inputs.slabAreaSqftOverride > 0
      ? inputs.slabAreaSqftOverride
      : getAutoSlabAreaSqft(inputs);

  const wallAreaAutoEstimated =
    inputs.wallAreaSqftOverride == null || inputs.wallAreaSqftOverride <= 0;

  const exteriorWallAreaSqft = wallAreaAutoEstimated
    ? getExteriorWallAreaSqft(inputs)
    : 0;
  const interiorWallAreaSqft = wallAreaAutoEstimated
    ? getInteriorWallAreaSqft(inputs)
    : 0;

  // Manual override: treat entire entered area as exterior thickness (user knows total).
  const wallAreaSqft = wallAreaAutoEstimated
    ? exteriorWallAreaSqft + interiorWallAreaSqft
    : inputs.wallAreaSqftOverride!;

  // ── Concrete volumes (cum) ──────────────────────────────────

  // Column: (w/1000)×(d/1000)×height × count
  const colW = inputs.columnWidthMm / 1000;
  const colD = inputs.columnDepthMm / 1000;
  const columnConcrete =
    colW * colD * Math.max(0, totalColumnHeightM) * columns;

  // Beam: (w/1000)×(d/1000)×avg length × count
  const beamW = inputs.beamWidthMm / 1000;
  const beamD = inputs.beamDepthMm / 1000;
  const avgBeamLengthM = inputs.avgBeamLengthFt * FT_TO_M;
  const beamConcrete = beamW * beamD * Math.max(0, avgBeamLengthM) * beams;

  // Footing: L×W×depth × footing count
  const footConcrete =
    (inputs.footingLengthMm / 1000) *
    (inputs.footingWidthMm / 1000) *
    (inputs.footingDepthMm / 1000) *
    footingCount;

  // Slab: area(sqm) × thickness(m)
  const slabAreaSqm = slabAreaSqft * SQFT_TO_SQM;
  const slabThicknessM = inputs.slabThicknessMm / 1000;
  const slabConcrete = slabAreaSqm * Math.max(0, slabThicknessM);

  const totalConcrete =
    columnConcrete + beamConcrete + footConcrete + slabConcrete;

  // ── Cement / sand / aggregate from RCC (one mix for entire structure) ─
  const ratio = MIX_RATIOS[inputs.mixGrade];
  const partsSum = ratio.cement + ratio.sand + ratio.aggregate;
  const dryVolume = totalConcrete * DRY_VOLUME_FACTOR;

  const rccCementCum = dryVolume * (ratio.cement / partsSum);
  const rccSandCum = dryVolume * (ratio.sand / partsSum);
  const aggregateCumRaw = dryVolume * (ratio.aggregate / partsSum);
  const cementBagsRcc = bagsFromCementVolume(rccCementCum);

  // ── Steel (kg), then group by diameter ───────────────────────
  const steelKg = new Map<number, number>();

  function addSteel(diaMm: number, kg: number) {
    if (kg <= 0 || diaMm <= 0) return;
    steelKg.set(diaMm, (steelKg.get(diaMm) ?? 0) + kg);
  }

  // (a) Column main bars
  const colMainLengthM =
    columns * inputs.rodsPerColumn * Math.max(0, totalColumnHeightM);
  addSteel(inputs.columnRodDiaMm, barWeightKg(inputs.columnRodDiaMm, colMainLengthM));

  // (b) Column stirrups
  // Count ≈ column height (mm) / spacing; each stirrup length ≈
  // perimeter of section + 100 mm hook allowance (common site rule).
  if (columns > 0 && inputs.columnStirrupSpacingMm > 0 && totalColumnHeightM > 0) {
    const colHeightMm = totalColumnHeightM * 1000;
    const stirrupsPerCol = Math.ceil(colHeightMm / inputs.columnStirrupSpacingMm);
    const stirrupLenM =
      (2 * (inputs.columnWidthMm + inputs.columnDepthMm) + 100) / 1000;
    const totalStirrupLenM = stirrupsPerCol * stirrupLenM * columns;
    addSteel(
      inputs.columnStirrupDiaMm,
      barWeightKg(inputs.columnStirrupDiaMm, totalStirrupLenM),
    );
  }

  // (c) Beam main bars
  const beamMainLengthM =
    beams * inputs.rodsPerBeam * Math.max(0, avgBeamLengthM);
  addSteel(inputs.beamRodDiaMm, barWeightKg(inputs.beamRodDiaMm, beamMainLengthM));

  // (d) Beam stirrups — same perimeter + 100 mm hook rule
  if (beams > 0 && inputs.beamStirrupSpacingMm > 0 && avgBeamLengthM > 0) {
    const beamLenMm = avgBeamLengthM * 1000;
    const stirrupsPerBeam = Math.ceil(beamLenMm / inputs.beamStirrupSpacingMm);
    const stirrupLenM =
      (2 * (inputs.beamWidthMm + inputs.beamDepthMm) + 100) / 1000;
    const totalStirrupLenM = stirrupsPerBeam * stirrupLenM * beams;
    addSteel(
      inputs.beamStirrupDiaMm,
      barWeightKg(inputs.beamStirrupDiaMm, totalStirrupLenM),
    );
  }

  // (e) Footing steel — TWO-WAY mesh
  // Assumption: `rodsPerFootingOneWay` is rods in ONE direction.
  // Total rods per footing = 2 × that value (each way). Length per
  // rod ≈ average footing side (mean of L and W).
  if (footingCount > 0 && inputs.rodsPerFootingOneWay > 0) {
    const avgSideM =
      ((inputs.footingLengthMm + inputs.footingWidthMm) / 2) / 1000;
    const totalRods = footingCount * inputs.rodsPerFootingOneWay * 2;
    addSteel(
      inputs.footingRodDiaMm,
      barWeightKg(inputs.footingRodDiaMm, totalRods * avgSideM),
    );
  }

  // (f) Slab steel — thumb rule 100 kg/cum of slab concrete.
  // Diameter reporting: entire thumb-rule tonnage is attributed to
  // the MAIN bar diameter. Spacing / dist-bar fields are kept for
  // UI documentation only; they do not drive this weight (span
  // unknowns make spacing-based calc unreliable for budgeting).
  const slabSteelKg = slabConcrete * SLAB_STEEL_KG_PER_CUM;
  addSteel(inputs.slabMainDiaMm, slabSteelKg);

  // Wastage applies to FINAL material outputs only (not raw volumes used mid-calc).
  const wastage = inputs.wastagePercent;
  const steelByDiameter: SteelByDiameter[] = Array.from(steelKg.entries())
    .map(([diameterMm, kg]) => {
      const withWaste = applyWastage(kg, wastage);
      return {
        diameterMm,
        kg: round2(withWaste),
        quintals: round2(withWaste / 100), // 1 quintal = 100 kg
      };
    })
    .filter((row) => row.quintals > 0)
    .sort((a, b) => a.diameterMm - b.diameterMm);

  const totalSteelKg = steelByDiameter.reduce((s, r) => s + r.kg, 0);

  // ── Bricks + brick mortar + plaster ─────────────────────────
  // Exterior brickwork: user-selected thickness (default 9").
  // Interior brickwork: standard BHK partition length @ 4.5" half-brick.
  // Manual wall-area override: entire area uses exterior thickness.
  const exteriorThickM = WALL_THICKNESS_M[inputs.wallThickness];
  let brickworkCum = 0;
  if (wallAreaAutoEstimated) {
    brickworkCum =
      exteriorWallAreaSqft * SQFT_TO_SQM * exteriorThickM +
      interiorWallAreaSqft * SQFT_TO_SQM * INTERIOR_WALL_THICKNESS_M;
  } else {
    brickworkCum = wallAreaSqft * SQFT_TO_SQM * exteriorThickM;
  }

  const bricksRaw = Math.ceil(brickworkCum / BRICK_WITH_MORTAR_CUM);
  const bricks = Math.ceil(applyWastage(bricksRaw, wastage));

  // Brick masonry mortar (1:6) — cement + sand for joints (not previously counted).
  const brickMortarWet = brickworkCum * BRICK_MORTAR_WET_FRACTION;
  const brickMortar = mortarCementAndSand(
    brickMortarWet,
    BRICK_MORTAR_CEMENT_PARTS,
    BRICK_MORTAR_SAND_PARTS,
  );
  const cementBagsBrickMortar = bagsFromCementVolume(brickMortar.cementCum);

  // Plaster both faces of all walls: 2 × one-face area × 12 mm, mix 1:4.
  const plasterAreaSqm = wallAreaSqft * SQFT_TO_SQM * 2;
  const plasterWetCum = plasterAreaSqm * PLASTER_THICKNESS_M;
  const plaster = mortarCementAndSand(
    plasterWetCum,
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
    },
  };
}
