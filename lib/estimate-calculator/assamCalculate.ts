// ============================================================
// Assam Type (semi-pucca) quantity engine
// Brick to sill/lintel + timber frame + CGI roof — budgeting QTO.
// Anchored to WHE Assam-type / Ikra practice (not full RCC).
// ============================================================

import {
  ASSAM_BRICK_HEIGHT_FT,
  INTERIOR_WALL_LENGTH_FT_PER_FLOOR,
  type AssamEstimateInputs,
  type AssamEstimateResults,
  type UnitType,
} from './types';

const SQFT_TO_SQM = 0.092903;
const FT_TO_M = 0.3048;
const CUM_TO_CFT = 35.3147;

const MORTAR_DRY_VOLUME_FACTOR = 1.33;
const CEMENT_BAG_CUM = 0.0347;
const BRICK_WITH_MORTAR_CUM = 0.002;
const BRICK_MORTAR_WET_FRACTION = 0.3;
const BRICK_MORTAR_CEMENT_PARTS = 1;
const BRICK_MORTAR_SAND_PARTS = 6;

const PLASTER_THICKNESS_M = 0.012;
const PLASTER_CEMENT_PARTS = 1;
const PLASTER_SAND_PARTS = 4;

/** Exterior brick / plinth — 9″. */
const EXT_BRICK_THICKNESS_M = 0.2286;
/** Interior brick — 4.5″. */
const INT_BRICK_THICKNESS_M = 0.1143;
/** Foundation wall below GL — 250 mm (WHE recent practice). */
const FOUNDATION_THICKNESS_M = 0.25;
/** Flooring brick soling ≈ 75 mm. */
const BRICK_SOLING_THICKNESS_M = 0.075;

/** PCC pedestal under timber post — 300×300×450 mm, mix 1:3:6. */
const PEDESTAL_L_M = 0.3;
const PEDESTAL_W_M = 0.3;
const PEDESTAL_H_M = 0.45;
const PCC_CEMENT_PARTS = 1;
const PCC_SAND_PARTS = 3;
const PCC_AGG_PARTS = 6;
const CONCRETE_DRY_FACTOR = 1.54;

/** Rafter section 100×150 mm; purlin 50×75 mm. */
const RAFTER_SECTION_M2 = 0.1 * 0.15;
const PURLIN_SECTION_M2 = 0.05 * 0.075;

const OPENINGS_FACTOR_PANEL = 0.85;

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

export function getAssamExteriorPerimeterFt(builtUpSqft: number): number {
  const area = Math.max(0, builtUpSqft);
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

export function getAssamInteriorWallLengthFt(unitType: UnitType, builtUpSqft: number): number {
  if (unitType !== 'Custom') return INTERIOR_WALL_LENGTH_FT_PER_FLOOR[unitType];
  return Math.max(0, builtUpSqft) * 0.045;
}

export function getAssamBrickWallHeightFt(inputs: AssamEstimateInputs): number {
  return ASSAM_BRICK_HEIGHT_FT[inputs.brickWallUpTo];
}

/** Timber clear height above brick (to eaves). */
export function getAssamTimberPostHeightFt(inputs: AssamEstimateInputs): number {
  const brickH = getAssamBrickWallHeightFt(inputs);
  return Math.max(0, inputs.eavesHeightFt - brickH);
}

/**
 * Band count along walls:
 * - Brick to sill → sill + lintel + eaves (3)
 * - Brick to lintel → lintel + eaves (2) — sill already in masonry
 */
export function getAssamBandCount(inputs: AssamEstimateInputs): number {
  return inputs.brickWallUpTo === 'lintel' ? 2 : 3;
}

export function calculateAssamEstimate(inputs: AssamEstimateInputs): AssamEstimateResults {
  const floors = Math.max(1, Math.floor(inputs.floors));
  const builtUp = Math.max(0, inputs.builtUpAreaPerFloorSqft);
  const totalBuiltUpSqft = builtUp * floors;
  const wastage = inputs.wastagePercent;

  const perimeterFt = getAssamExteriorPerimeterFt(builtUp);
  const interiorFt = getAssamInteriorWallLengthFt(inputs.unitType, builtUp);
  const wallLengthFt = perimeterFt + interiorFt;
  const wallLengthM = wallLengthFt * FT_TO_M;

  const brickWallHeightFt = getAssamBrickWallHeightFt(inputs);
  const timberPostHeightFt = getAssamTimberPostHeightFt(inputs);
  const plinthFt = Math.max(0, inputs.plinthHeightFt);
  const foundationFt = Math.max(0, inputs.foundationDepthFt);

  // ── Brickwork ──────────────────────────────────────────────
  // Foundation below GL — exterior only, 250 mm
  const foundationVol =
    perimeterFt * FT_TO_M * (foundationFt * FT_TO_M) * FOUNDATION_THICKNESS_M;

  // Exterior above GL: plinth + brick to sill/lintel — 9″
  const extBrickHeightFt = plinthFt + brickWallHeightFt;
  const extBrickVol =
    perimeterFt * FT_TO_M * (extBrickHeightFt * FT_TO_M) * EXT_BRICK_THICKNESS_M * floors;

  // Interior brick to sill/lintel — 4.5″ (no deep foundation)
  const intBrickVol =
    interiorFt * FT_TO_M * (brickWallHeightFt * FT_TO_M) * INT_BRICK_THICKNESS_M * floors;

  const wallBrickVol = foundationVol + extBrickVol + intBrickVol;
  const bricksWallsRaw = wallBrickVol / BRICK_WITH_MORTAR_CUM;

  // Flooring brick soling — ground floor footprint
  const flooringVol = builtUp * SQFT_TO_SQM * BRICK_SOLING_THICKNESS_M;
  const bricksFlooringRaw = flooringVol / BRICK_WITH_MORTAR_CUM;

  const bricksFoundation = Math.ceil(applyWastage(foundationVol / BRICK_WITH_MORTAR_CUM, wastage));
  const bricksWalls = Math.ceil(
    applyWastage(bricksWallsRaw - foundationVol / BRICK_WITH_MORTAR_CUM, wastage),
  );
  const bricksFlooring = Math.ceil(applyWastage(bricksFlooringRaw, wastage));
  const bricks = bricksFoundation + bricksWalls + bricksFlooring;

  // Brick mortar 1:6
  const mortarWet = (wallBrickVol + flooringVol) * BRICK_MORTAR_WET_FRACTION;
  const brickMortar = mortarCementAndSand(
    mortarWet,
    BRICK_MORTAR_CEMENT_PARTS,
    BRICK_MORTAR_SAND_PARTS,
  );

  // ── Timber posts ───────────────────────────────────────────
  const spacingM = Math.max(0.5, inputs.postSpacingM);
  const postCount = wallLengthM > 0 ? Math.max(4, Math.ceil(wallLengthM / spacingM)) : 0;
  const postSectionM2 = (inputs.postWidthMm / 1000) * (inputs.postDepthMm / 1000);
  const postHeightM = timberPostHeightFt * FT_TO_M;
  const postsCum = postCount * postSectionM2 * Math.max(0, postHeightM);

  // ── Timber bands ───────────────────────────────────────────
  const bandCount = getAssamBandCount(inputs);
  const bandLengthFt = wallLengthFt * floors * bandCount;
  const bandSectionM2 = (inputs.bandWidthMm / 1000) * (inputs.bandDepthMm / 1000);
  const bandsCum = bandLengthFt * FT_TO_M * bandSectionM2;

  // ── CGI roof (once on top storey) ───────────────────────────
  const roofPlanSqft = builtUp;
  const pitch = Math.max(1, inputs.cgiPitchFactor);
  const cgiWaste = Math.max(0, inputs.cgiWastagePercent);
  const cgiAreaSqft = round1(roofPlanSqft * pitch * (1 + cgiWaste / 100));

  const sideM = builtUp > 0 ? Math.sqrt(builtUp) * FT_TO_M : 0;
  const rafterSpM = Math.max(0.3, inputs.rafterSpacingMm / 1000);
  const purlinSpM = Math.max(0.2, inputs.purlinSpacingMm / 1000);
  const nRafterLines = sideM > 0 ? Math.floor(sideM / rafterSpM) + 1 : 0;
  // Half-span slope length ≈ (side/2) × sqrt(pitch) as simple gable approx
  const halfSlopeM = (sideM / 2) * Math.sqrt(pitch);
  const totalRafterM = nRafterLines * 2 * halfSlopeM;
  const rafterCum = totalRafterM * RAFTER_SECTION_M2;

  const purlinRowsPerSlope = halfSlopeM > 0 ? Math.floor(halfSlopeM / purlinSpM) + 1 : 0;
  const totalPurlinM = purlinRowsPerSlope * 2 * sideM;
  const purlinCum = totalPurlinM * PURLIN_SECTION_M2;
  const roofTimberCum = rafterCum + purlinCum;

  const timberCumRaw = postsCum + bandsCum + roofTimberCum;
  const timberCft = round1(applyWastage(timberCumRaw * CUM_TO_CFT, wastage));
  const timberPostsCft = round1(applyWastage(postsCum * CUM_TO_CFT, wastage));
  const timberBandsCft = round1(applyWastage(bandsCum * CUM_TO_CFT, wastage));
  const timberRoofCft = round1(applyWastage(roofTimberCum * CUM_TO_CFT, wastage));

  // ── Wall panels above brick ────────────────────────────────
  const panelHeightFt = timberPostHeightFt;
  const panelAreaRaw =
    wallLengthFt * Math.max(0, panelHeightFt) * floors * OPENINGS_FACTOR_PANEL;
  const wallPanelAreaSqft = round1(applyWastage(panelAreaRaw, wastage));

  // Plaster both faces on brick + panels (openings already in panel factor; brick 0.85)
  const brickFaceAreaSqft =
    (perimeterFt * extBrickHeightFt + interiorFt * brickWallHeightFt) * floors * 0.85;
  const plasterAreaSqft = round1((brickFaceAreaSqft + panelAreaRaw) * 2);
  const plasterWet = plasterAreaSqft * SQFT_TO_SQM * PLASTER_THICKNESS_M;
  const plaster = mortarCementAndSand(plasterWet, PLASTER_CEMENT_PARTS, PLASTER_SAND_PARTS);

  // ── PCC pedestals under posts ──────────────────────────────
  const pccPedestalCum = postCount * PEDESTAL_L_M * PEDESTAL_W_M * PEDESTAL_H_M;
  const pccDry = pccPedestalCum * CONCRETE_DRY_FACTOR;
  const pccParts = PCC_CEMENT_PARTS + PCC_SAND_PARTS + PCC_AGG_PARTS;
  const pccCementCum = pccDry * (PCC_CEMENT_PARTS / pccParts);
  const pccSandCum = pccDry * (PCC_SAND_PARTS / pccParts);
  const pccAggCum = pccDry * (PCC_AGG_PARTS / pccParts);

  const cementBagsBrickMortar = bagsFromCementVolume(brickMortar.cementCum);
  const cementBagsPlaster = bagsFromCementVolume(plaster.cementCum);
  const cementBagsPcc = bagsFromCementVolume(pccCementCum);
  const cementBags = Math.ceil(
    applyWastage(cementBagsBrickMortar + cementBagsPlaster + cementBagsPcc, wastage),
  );

  const sandCum = round2(
    applyWastage(brickMortar.sandCum + plaster.sandCum + pccSandCum, wastage),
  );
  const aggregateCum = round2(applyWastage(pccAggCum, wastage));

  return {
    bricks,
    cementBags,
    sandCum,
    aggregateCum,
    timberCft,
    cgiAreaSqft,
    wallPanelAreaSqft,
    plasterAreaSqft,
    wastagePercent: wastage,
    meta: {
      builtUpAreaPerFloorSqft: builtUp,
      totalBuiltUpSqft,
      exteriorPerimeterFt: round1(perimeterFt),
      interiorWallLengthFt: round1(interiorFt),
      brickWallHeightFt,
      brickWallUpTo: inputs.brickWallUpTo,
      eavesHeightFt: inputs.eavesHeightFt,
      timberPostHeightFt: round1(timberPostHeightFt),
      timberPostCount: postCount,
      bandCount,
      bandLengthFt: round1(bandLengthFt),
      roofPlanSqft: roofPlanSqft,
      cgiPitchFactor: pitch,
      bricksFoundation,
      bricksWalls,
      bricksFlooring,
      cementBagsBrickMortar,
      cementBagsPlaster,
      cementBagsPcc,
      timberPostsCft,
      timberBandsCft,
      timberRoofCft,
      pccPedestalCum: round2(pccPedestalCum),
    },
  };
}
