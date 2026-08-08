// ============================================================
// Assam Type (modern) quantity engine
// Single-storey RCC frame + 5″ brick + tin roof / truss.
// Like RCC ground floor WITHOUT slab & floor beams.
// ============================================================

import {
  getFootingBarsAlong,
  LINTEL_STANDARD,
} from './calculate';
import {
  ASSAM_PLINTH_THICKNESS_M,
  ASSAM_WALL_THICKNESS_M,
  INTERIOR_WALL_LENGTH_FT_PER_FLOOR,
  LAP_LENGTH_MULTIPLIER,
  MIX_RATIOS,
  STANDARD_BAR_SPACING_MM,
  type AssamEstimateInputs,
  type AssamEstimateResults,
  type BarDiameter,
  type SteelByDiameter,
  type UnitType,
} from './types';

const SQFT_TO_SQM = 0.092903;
const FT_TO_M = 0.3048;
const CUM_TO_CFT = 35.3147;

const DRY_VOLUME_FACTOR = 1.54;
const MORTAR_DRY_VOLUME_FACTOR = 1.33;
const CEMENT_BAG_CUM = 0.0347;
const BRICK_WITH_MORTAR_CUM = 0.002;
const BRICK_MORTAR_WET_FRACTION = 0.3;
const BRICK_MORTAR_CEMENT_PARTS = 1;
const BRICK_MORTAR_SAND_PARTS = 6;
const PLASTER_THICKNESS_M = 0.012;
const PLASTER_CEMENT_PARTS = 1;
const PLASTER_SAND_PARTS = 4;
const BRICK_SOLING_THICKNESS_M = 0.075;

const COVER_COLUMN_MM = 40;
const COVER_BEAM_MM = 25;

/** RCC king-post / timber member sections (estimation). */
const TRUSS_TIE_W_M = 0.2;
const TRUSS_TIE_D_M = 0.2;
const TRUSS_RAFTER_W_M = 0.15;
const TRUSS_RAFTER_D_M = 0.15;
const TRUSS_KING_W_M = 0.15;
const TRUSS_KING_D_M = 0.15;
/** Extra steel density for RCC truss members (kg/cum). */
const TRUSS_STEEL_KG_PER_CUM = 100;

function barWeightKg(diameterMm: number, lengthM: number): number {
  if (lengthM <= 0 || diameterMm <= 0) return 0;
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

export function getAssamExteriorPerimeterFt(builtUpSqft: number): number {
  const area = Math.max(0, builtUpSqft);
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

export function getAssamInteriorWallLengthFt(unitType: UnitType, builtUpSqft: number): number {
  if (unitType !== 'Custom') return INTERIOR_WALL_LENGTH_FT_PER_FLOOR[unitType];
  return Math.max(0, builtUpSqft) * 0.045;
}

export function getAssamTotalColumnHeightFt(inputs: AssamEstimateInputs): number {
  return (
    Math.max(0, inputs.foundationDepthFt) +
    Math.max(0, inputs.plinthHeightFt) +
    Math.max(0, inputs.wallHeightFt)
  );
}

export function getAssamFootingCount(inputs: AssamEstimateInputs): number {
  const cols = Math.max(0, Math.floor(inputs.columnCount));
  if (cols === 0) return 0;
  if (inputs.footingType === 'combined') return Math.ceil(cols / 2);
  return cols;
}

/** Square-plan side length (ft) from built-up. */
export function getAssamPlanSideFt(builtUpSqft: number): number {
  return Math.sqrt(Math.max(0, builtUpSqft));
}

export function getAssamTrussCount(inputs: AssamEstimateInputs): number {
  const side = getAssamPlanSideFt(inputs.builtUpAreaSqft);
  const spacing = Math.max(6, inputs.trussSpacingFt);
  if (side <= 0) return 0;
  return Math.floor(side / spacing) + 1;
}

function columnBarCuttingLengthM(totalColumnHeightM: number, diaMm: number): number {
  const Ld = lapLengthM(diaMm);
  // Single storey: height + footing development + one storey lap
  return Math.max(0, totalColumnHeightM) + 2 * Ld;
}

function beamBarCuttingLengthM(avgBeamLengthM: number, diaMm: number): number {
  const Ld = lapLengthM(diaMm);
  const midLap = avgBeamLengthM > 10 ? Ld : 0;
  return Math.max(0, avgBeamLengthM) + 2 * Ld + midLap;
}

/**
 * One king-post truss geometry (gable):
 * - tie = full span
 * - 2 rafters ≈ half-span × sqrt(pitch)
 * - king post ≈ rise ≈ half-span × (sqrt(pitch)-ish from pitch factor)
 */
function trussMemberLengthsM(spanFt: number, pitchFactor: number): {
  tieM: number;
  rafterM: number;
  kingM: number;
} {
  const spanM = spanFt * FT_TO_M;
  const half = spanM / 2;
  const slope = half * Math.sqrt(Math.max(1, pitchFactor));
  const rise = Math.sqrt(Math.max(0, slope * slope - half * half));
  return {
    tieM: spanM,
    rafterM: slope,
    kingM: rise,
  };
}

function rccTrussConcreteCum(spanFt: number, pitchFactor: number, trussCount: number): number {
  const { tieM, rafterM, kingM } = trussMemberLengthsM(spanFt, pitchFactor);
  const one =
    tieM * TRUSS_TIE_W_M * TRUSS_TIE_D_M +
    2 * rafterM * TRUSS_RAFTER_W_M * TRUSS_RAFTER_D_M +
    kingM * TRUSS_KING_W_M * TRUSS_KING_D_M;
  return one * Math.max(0, trussCount);
}

function timberTrussCft(spanFt: number, pitchFactor: number, trussCount: number): number {
  // Slightly larger timber sections than RCC estimation sections
  const { tieM, rafterM, kingM } = trussMemberLengthsM(spanFt, pitchFactor);
  const oneCum =
    tieM * 0.1 * 0.15 +
    2 * rafterM * 0.1 * 0.125 +
    kingM * 0.1 * 0.1 +
    // purlins allowance along span (approx)
    spanFt * FT_TO_M * 0.05 * 0.075 * 6;
  return oneCum * Math.max(0, trussCount) * CUM_TO_CFT;
}

export function calculateAssamEstimate(inputs: AssamEstimateInputs): AssamEstimateResults {
  const builtUp = Math.max(0, inputs.builtUpAreaSqft);
  const columns = Math.max(0, Math.floor(inputs.columnCount));
  const plinthBeams = Math.max(0, Math.floor(inputs.plinthBeamCount));
  const footingCount = getAssamFootingCount(inputs);
  const spacingMm = STANDARD_BAR_SPACING_MM;
  const wastage = inputs.wastagePercent;

  const totalColumnHeightFt = getAssamTotalColumnHeightFt(inputs);
  const totalColumnHeightM = totalColumnHeightFt * FT_TO_M;

  const perimeterFt = getAssamExteriorPerimeterFt(builtUp);
  const interiorFt = getAssamInteriorWallLengthFt(inputs.unitType, builtUp);
  const wallLengthFt = perimeterFt + interiorFt;

  // Walls: 9″ plinth exterior; 5″ above plinth exterior + interior to wall height
  const plinthExtAreaSqft = perimeterFt * Math.max(0, inputs.plinthHeightFt);
  const superExtAreaSqft = perimeterFt * Math.max(0, inputs.wallHeightFt) * 0.8;
  const interiorAreaSqft = interiorFt * Math.max(0, inputs.wallHeightFt) * 0.9;
  const exteriorWallAreaSqft = plinthExtAreaSqft + superExtAreaSqft;
  const wallAreaSqft = exteriorWallAreaSqft + interiorAreaSqft;

  // ── Concrete ────────────────────────────────────────────────
  const colW = inputs.columnWidthMm / 1000;
  const colD = inputs.columnDepthMm / 1000;
  const columnConcrete = colW * colD * Math.max(0, totalColumnHeightM) * columns;

  const pbW = inputs.plinthBeamWidthMm / 1000;
  const pbD = inputs.plinthBeamDepthMm / 1000;
  const avgPbLenM = inputs.avgPlinthBeamLengthFt * FT_TO_M;
  const plinthBeamConcrete = pbW * pbD * Math.max(0, avgPbLenM) * plinthBeams;

  const lintelLengthFt = wallLengthFt; // single storey
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

  const trussSpanFt = getAssamPlanSideFt(builtUp);
  const trussCount = getAssamTrussCount(inputs);
  const pitch = Math.max(1, inputs.tinPitchFactor);
  const trussConcrete =
    inputs.trussType === 'rcc_king_post'
      ? rccTrussConcreteCum(trussSpanFt, pitch, trussCount)
      : 0;

  const totalConcrete =
    columnConcrete + plinthBeamConcrete + lintelConcrete + footConcrete + trussConcrete;

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
    const lenOne = columnBarCuttingLengthM(totalColumnHeightM, set.dia);
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

  const pbSets = [
    { count: Math.max(0, Math.floor(inputs.plinthBeamRodsCount1)), dia: inputs.plinthBeamRodDia1Mm },
    { count: Math.max(0, Math.floor(inputs.plinthBeamRodsCount2)), dia: inputs.plinthBeamRodDia2Mm },
  ];
  for (const set of pbSets) {
    if (set.count === 0) continue;
    const lenOne = beamBarCuttingLengthM(avgPbLenM, set.dia);
    addSteel(set.dia, barWeightKg(set.dia, plinthBeams * set.count * lenOne));
  }

  if (plinthBeams > 0 && avgPbLenM > 0) {
    const stirrupsPerBeam = Math.ceil((avgPbLenM * 1000) / spacingMm);
    const stirrupLenM = stirrupCuttingLengthM(
      inputs.plinthBeamWidthMm,
      inputs.plinthBeamDepthMm,
      COVER_BEAM_MM,
      inputs.plinthBeamStirrupDiaMm,
    );
    addSteel(
      inputs.plinthBeamStirrupDiaMm,
      barWeightKg(inputs.plinthBeamStirrupDiaMm, stirrupsPerBeam * stirrupLenM * plinthBeams),
    );
  }

  if (lintelLengthM > 0) {
    const lintelLdBottom = lapLengthM(LINTEL_STANDARD.bottomDiaMm);
    const lintelLdTop = lapLengthM(LINTEL_STANDARD.topDiaMm);
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
    const barsAlongLength = getFootingBarsAlong(inputs.footingWidthMm, spacingMm);
    const barsAlongWidth = getFootingBarsAlong(inputs.footingLengthMm, spacingMm);
    const Ld = lapLengthM(inputs.footingRodDiaMm);
    const lenAlongLengthM = inputs.footingLengthMm / 1000 + Ld;
    const lenAlongWidthM = inputs.footingWidthMm / 1000 + Ld;
    const totalLengthM =
      footingCount * (barsAlongLength * lenAlongLengthM + barsAlongWidth * lenAlongWidthM);
    addSteel(inputs.footingRodDiaMm, barWeightKg(inputs.footingRodDiaMm, totalLengthM));
  }

  if (inputs.trussType === 'rcc_king_post' && trussConcrete > 0) {
    // Distribute truss steel mainly as 12 mm + 8 mm
    const trussSteelKg = trussConcrete * TRUSS_STEEL_KG_PER_CUM;
    addSteel(12 as BarDiameter, trussSteelKg * 0.7);
    addSteel(8 as BarDiameter, trussSteelKg * 0.3);
  }

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
  const wallBrickworkCum =
    plinthExtAreaSqft * SQFT_TO_SQM * ASSAM_PLINTH_THICKNESS_M +
    superExtAreaSqft * SQFT_TO_SQM * ASSAM_WALL_THICKNESS_M +
    interiorAreaSqft * SQFT_TO_SQM * ASSAM_WALL_THICKNESS_M;
  const bricksWallsRaw = Math.ceil(wallBrickworkCum / BRICK_WITH_MORTAR_CUM);

  const footingPlanSqm =
    footingCount *
    (inputs.footingLengthMm / 1000) *
    (inputs.footingWidthMm / 1000);
  const foundationSolingCum = footingPlanSqm * BRICK_SOLING_THICKNESS_M;
  const bricksFoundationRaw = Math.ceil(foundationSolingCum / BRICK_WITH_MORTAR_CUM);

  const flooringSolingCum = builtUp * SQFT_TO_SQM * BRICK_SOLING_THICKNESS_M;
  const bricksFlooringRaw = Math.ceil(flooringSolingCum / BRICK_WITH_MORTAR_CUM);

  const totalBrickworkCum = wallBrickworkCum + foundationSolingCum + flooringSolingCum;
  const bricks = Math.ceil(
    applyWastage(bricksWallsRaw + bricksFoundationRaw + bricksFlooringRaw, wastage),
  );

  const brickMortar = mortarCementAndSand(
    totalBrickworkCum * BRICK_MORTAR_WET_FRACTION,
    BRICK_MORTAR_CEMENT_PARTS,
    BRICK_MORTAR_SAND_PARTS,
  );
  const cementBagsBrickMortar = bagsFromCementVolume(brickMortar.cementCum);

  // Plaster both faces of walls (no ceiling slab)
  const plasterAreaSqft = round1(wallAreaSqft * 2);
  const plaster = mortarCementAndSand(
    plasterAreaSqft * SQFT_TO_SQM * PLASTER_THICKNESS_M,
    PLASTER_CEMENT_PARTS,
    PLASTER_SAND_PARTS,
  );
  const cementBagsPlaster = bagsFromCementVolume(plaster.cementCum);

  const cementBagsRaw = cementBagsRcc + cementBagsBrickMortar + cementBagsPlaster;
  const sandCumRaw = rccSandCum + brickMortar.sandCum + plaster.sandCum;

  // ── Tin roof ────────────────────────────────────────────────
  const tinWaste = Math.max(0, inputs.tinWastagePercent);
  const tinRoofAreaSqft = round1(builtUp * pitch * (1 + tinWaste / 100));

  const timberCft =
    inputs.trussType === 'timber'
      ? round1(applyWastage(timberTrussCft(trussSpanFt, pitch, trussCount), wastage))
      : 0;

  return {
    concreteVolumeCum: {
      columns: round2(columnConcrete),
      plinthBeams: round2(plinthBeamConcrete),
      lintels: round2(lintelConcrete),
      footings: round2(footConcrete),
      trusses: round2(trussConcrete),
      total: round2(totalConcrete),
    },
    cementBags: Math.ceil(applyWastage(cementBagsRaw, wastage)),
    sandCum: round2(applyWastage(sandCumRaw, wastage)),
    aggregateCum: round2(applyWastage(aggregateCumRaw, wastage)),
    bricks,
    steelByDiameter,
    totalSteelQuintals: round2(totalSteelKg / 100),
    timberCft,
    tinRoofAreaSqft,
    plasterAreaSqft,
    wastagePercent: wastage,
    meta: {
      builtUpAreaSqft: round1(builtUp),
      exteriorPerimeterFt: round1(perimeterFt),
      interiorWallLengthFt: round1(interiorFt),
      wallAreaSqft: round1(wallAreaSqft),
      exteriorWallAreaSqft: round1(exteriorWallAreaSqft),
      interiorWallAreaSqft: round1(interiorAreaSqft),
      footingCount,
      totalColumnHeightFt: round2(totalColumnHeightFt),
      lintelLengthFt: round1(lintelLengthFt),
      plinthBeamCount: plinthBeams,
      trussType: inputs.trussType,
      trussCount,
      trussSpanFt: round1(trussSpanFt),
      roofPlanSqft: round1(builtUp),
      tinPitchFactor: pitch,
      cementBagsRcc,
      cementBagsBrickMortar,
      cementBagsPlaster,
      bricksWalls: Math.ceil(applyWastage(bricksWallsRaw, wastage)),
      bricksFoundationSoling: Math.ceil(applyWastage(bricksFoundationRaw, wastage)),
      bricksFlooring: Math.ceil(applyWastage(bricksFlooringRaw, wastage)),
      standardSpacingMm: spacingMm,
      lapMultiplier: LAP_LENGTH_MULTIPLIER,
    },
  };
}
