import {
  floorPlanUpperCount,
  hasAssamMistriFloorWork,
  isAssamMistriFloor,
  parseMistriDetails,
  type MistriDetails,
  type MistriFloorWork,
} from '@/lib/mistriDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import type { TrackType } from '@/lib/types';

export interface ThumbRuleRow {
  label: string;
  value: string;
}

export interface MistriThumbRulesProjectInput {
  id: string;
  numeric_id?: string | null;
  title: string;
  district: string;
  state?: string | null;
  pincode?: string | null;
  track_type: TrackType;
  total_floors?: number | null;
  plot_area_sqft?: number | null;
  floor_area_sqft?: number | null;
  mistri_details?: unknown;
}

export interface SectionDiagrams {
  column: {
    widthMm: number;
    depthMm: number;
    barCount: number;
    barDiaMm: number;
    coverMm: number;
    tieDiaMm: number;
    label: string;
  };
  beam: {
    widthMm: number;
    depthMm: number;
    topBars: number;
    topDiaMm: number;
    bottomBars: number;
    bottomDiaMm: number;
    coverMm: number;
    stirrupDiaMm: number;
    label: string;
  };
  footing: {
    sideFt: number;
    thickIn: number;
    pccIn: number;
    columnWidthMm: number;
    columnDepthMm: number;
    meshDiaMm: number;
    meshSpacingMm: number;
    coverMm: number;
    label: string;
  };
}

export interface MistriThumbRulesGuide {
  projectId: string;
  numericProjectId: string;
  projectTitle: string;
  siteAddress: string;
  generatedAtLabel: string;
  snapshotRows: ThumbRuleRow[];
  analysisRows: ThumbRuleRow[];
  seismicRows: ThumbRuleRow[];
  foundationRows: ThumbRuleRow[];
  columnRows: ThumbRuleRow[];
  beamRows: ThumbRuleRow[];
  slabRows: ThumbRuleRow[];
  steelRows: ThumbRuleRow[];
  coverRows: ThumbRuleRow[];
  masonryRows: ThumbRuleRow[];
  assamRows: ThumbRuleRow[];
  checklistRows: ThumbRuleRow[];
  clientSummaryRows: ThumbRuleRow[];
  howToRows: ThumbRuleRow[];
  scheduleRows: ThumbRuleRow[];
  quantityRows: ThumbRuleRow[];
  stageRows: ThumbRuleRow[];
  ownerCheckRows: ThumbRuleRow[];
  redFlagRows: ThumbRuleRow[];
  glossaryRows: ThumbRuleRow[];
  diagrams: SectionDiagrams;
  isAssamOnly: boolean;
  hasRccFrame: boolean;
  disclaimer: string;
}

/** Assam / NE India is IS 1893 Zone V. There is no official Zone VI - use Zone V + IS 13920. */
const SEISMIC_ZONE_LABEL = 'IS 1893 Zone V (Assam / North-East) - design as highest Indian zone';
/** Client rule: no RCC room / beam clear span beyond 15-16 ft. */
const DESIGN_SPAN_FT = 15.5;
const MAX_SPAN_FT = 16;
const SPAN_LABEL = '15-16';
const TYPICAL_TRIBUTARY_M2 = (DESIGN_SPAN_FT * 0.3048) ** 2;
const FLOOR_LOAD_KN_M2 = 14;
const SBC_KN_M2 = 125;
const SEISMIC_FOOTING_FACTOR = 1.15;
const STEEL_FY = 500;

function siteAddress(project: MistriThumbRulesProjectInput): string {
  const parts = [project.district?.trim(), project.state?.trim(), project.pincode?.trim()].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(', ') : '-';
}

function formatSqft(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '-';
  return `${Math.round(value).toLocaleString('en-IN')} sq. ft.`;
}

function sqftToM2(sqft: number): number {
  return Math.max(0, sqft) * 0.092903;
}

function storeysFromGPlus(upper: number | null, fallbackFloors?: number | null): number {
  if (upper != null && upper >= 0) return upper + 1;
  if (fallbackFloors && fallbackFloors > 0) return fallbackFloors;
  return 1;
}

function floorPlanLabel(value: string | null | undefined, storeys: number): string {
  const upper = floorPlanUpperCount(value);
  if (upper === 0) return 'G+0 (ground floor only)';
  if (upper != null) return `G+${upper} (${storeys} storeys)`;
  if (storeys === 1) return 'Ground floor only (assumed)';
  return `${storeys} storeys (from project floors)`;
}

function typicalFloorAreaSqft(
  project: MistriThumbRulesProjectInput,
  mistri: MistriDetails | null,
): number {
  const slabAreas =
    mistri?.floorWork
      ?.map((floor) => floor.slabAreaSqft)
      .filter((value): value is number => typeof value === 'number' && value > 0) ?? [];
  if (slabAreas.length > 0) return Math.max(...slabAreas);
  if (mistri && mistri.approximateAreaSqft > 0) return mistri.approximateAreaSqft;
  if (project.floor_area_sqft && project.floor_area_sqft > 0) return project.floor_area_sqft;
  if (project.plot_area_sqft && project.plot_area_sqft > 0) return project.plot_area_sqft;
  return 0;
}

function builtUpAreaSqft(mistri: MistriDetails | null, typicalFloor: number, storeys: number): number {
  const slabSum =
    mistri?.floorWork
      ?.map((floor) => floor.slabAreaSqft)
      .filter((value): value is number => typeof value === 'number' && value > 0)
      .reduce((sum, value) => sum + value, 0) ?? 0;
  if (slabSum > 0) return slabSum;
  if (typicalFloor > 0 && storeys > 0) return typicalFloor * storeys;
  return typicalFloor;
}

function hasRccContext(project: MistriThumbRulesProjectInput, mistri: MistriDetails | null): boolean {
  if (project.track_type === 'RCC') return true;
  return !!mistri?.floorWork?.some((floor) => !isAssamMistriFloor(floor.floorId));
}

function hasFrameScope(mistri: MistriDetails | null): boolean {
  if (!mistri) return false;
  if (
    mistri.civilWorkTypes?.some((type) =>
      ['complete_full_structure', 'foundation_concrete_structure', 'rcc_column_beam_slab'].includes(
        type,
      ),
    )
  ) {
    return true;
  }
  return !!mistri.floorWork?.some((floor) =>
    floor.workTypes.some((type) => type === 'full_finished' || type === 'frame_skeleton'),
  );
}

function hasBrickScope(mistri: MistriDetails | null): boolean {
  if (!mistri) return false;
  if (mistri.civilWorkTypes?.includes('brickwork_aac')) return true;
  return !!mistri.floorWork?.some((floor) =>
    floor.workTypes.some((type) => type === 'brick_aac' || type === 'full_finished'),
  );
}

function hasPlasterScope(mistri: MistriDetails | null): boolean {
  if (!mistri) return false;
  if (mistri.civilWorkTypes?.includes('plastering')) return true;
  return !!mistri.floorWork?.some(
    (floor) =>
      floor.workTypes.includes('plastering') ||
      floor.workTypes.includes('full_finished') ||
      floor.plasterScope != null,
  );
}

function hasFlooringScope(mistri: MistriDetails | null): boolean {
  if (!mistri) return false;
  if (mistri.civilWorkTypes?.includes('tile_marble_flooring')) return true;
  return !!mistri.floorWork?.some(
    (floor) =>
      floor.workTypes.includes('flooring') ||
      floor.includeFineFlooring === true ||
      floor.flooringMaterial != null,
  );
}

function hasBoundaryScope(mistri: MistriDetails | null): boolean {
  return !!mistri?.civilWorkTypes?.includes('boundary_wall_fencing');
}

function assamFoundationDepthFt(mistri: MistriDetails | null): number | null {
  const depths =
    mistri?.floorWork
      ?.map((floor) => floor.foundationDepthFt)
      .filter((value): value is number => typeof value === 'number' && value > 0) ?? [];
  if (depths.length === 0) return null;
  return Math.max(...depths);
}

function assamRoofSummary(floors: MistriFloorWork[] | null | undefined): string | null {
  const roof = floors?.find((floor) => floor.assamRoofType || floor.assamRoofingSheet);
  if (!roof) return null;
  const parts: string[] = [];
  if (roof.assamRoofType === 'steel_truss') parts.push('Steel truss');
  if (roof.assamRoofType === 'rcc_truss') parts.push('RCC truss');
  if (roof.assamRoofType === 'wood_truss') parts.push('Wood truss');
  if (roof.assamRoofingSheet === 'basic_gi_tin') parts.push('basic GI / tin sheet');
  if (roof.assamRoofingSheet === 'colour_coated_metal') parts.push('colour-coated metal sheet');
  if (roof.assamRoofingSheet === 'upvc') parts.push('UPVC sheet');
  return parts.length > 0 ? parts.join(' + ') : null;
}

function estimatedColumnCount(floorSqft: number): number {
  const areaM2 = sqftToM2(Math.max(floorSqft, 600));
  const raw = Math.round(areaM2 / TYPICAL_TRIBUTARY_M2);
  return Math.max(6, Math.min(25, raw));
}

function barAreaMm2(count: number, diaMm: number): number {
  return count * (Math.PI * diaMm * diaMm) / 4;
}

function shortColumnCapacityKn(
  widthMm: number,
  depthMm: number,
  barCount: number,
  barDiaMm: number,
  fck: number,
): number {
  const ac = widthMm * depthMm;
  const asc = barAreaMm2(barCount, barDiaMm);
  return (0.4 * fck * ac + 0.67 * STEEL_FY * asc) / 1000;
}

function beamMomentCapacityKnm(
  widthMm: number,
  overallMm: number,
  barCount: number,
  barDiaMm: number,
  fck: number,
): number {
  const d = overallMm - 25 - 8 - barDiaMm / 2;
  const ast = barAreaMm2(barCount, barDiaMm);
  const lever = 1 - (ast * STEEL_FY) / (widthMm * d * fck);
  return (0.87 * STEEL_FY * ast * d * Math.max(0.55, lever)) / 1e6;
}

function footingMeshCtcMm(sideFt: number): number {
  if (sideFt >= 12) return 100;
  if (sideFt >= 10) return 125;
  return 150;
}

function columnServiceLoadKn(floorSqft: number, storeys: number, columnCount: number): number {
  const trib = sqftToM2(Math.max(floorSqft, 600)) / columnCount;
  return trib * FLOOR_LOAD_KN_M2 * storeys * 1.1;
}

function roundHalfFt(value: number): number {
  return Math.ceil(value * 2) / 2;
}

interface HouseAnalysis {
  columnCount: number;
  tributaryM2: number;
  serviceLoadKn: number;
  designLoadKn: number;
  footingSideFt: number;
  footingThickIn: number;
  columnSizeIn: string;
  columnSizeMm: string;
  columnBars: string;
  plinthSize: string;
  plinthBars: string;
  plinthStirrups: string;
  floorBeamSize: string;
  floorBeamBars: string;
  floorBeamStirrups: string;
  typicalBeamNote: string;
  longBeamNote: string;
  slabThk: string;
  concreteGrade: string;
  columnWidthMm: number;
  columnDepthMm: number;
  columnBarCount: number;
  columnBarDiaMm: number;
  beamWidthMm: number;
  beamDepthMm: number;
  beamTopBars: number;
  beamTopDiaMm: number;
  beamBottomBars: number;
  beamBottomDiaMm: number;
  plinthWidthMm: number;
  plinthDepthMm: number;
  plinthBarCount: number;
  plinthBarDiaMm: number;
  footingMeshCtcMm: number;
  columnCapacityKn: number;
  columnFactoredKn: number;
  beamCapacityKnm: number;
  diagrams: SectionDiagrams;
}

function analyzeHouse(floorSqft: number, storeys: number): HouseAnalysis {
  const columnCount = estimatedColumnCount(floorSqft);
  const tributaryM2 = sqftToM2(Math.max(floorSqft, 600)) / columnCount;
  const serviceLoadKn = columnServiceLoadKn(floorSqft, storeys, columnCount);
  const designLoadKn = serviceLoadKn * SEISMIC_FOOTING_FACTOR;
  const sideM = Math.sqrt(designLoadKn / SBC_KN_M2);
  const footingSideFt = Math.max(4, roundHalfFt(sideM * 3.28084));
  const thickFromStorey = storeys <= 1 ? 12 : storeys === 2 ? 15 : storeys === 3 ? 18 : storeys === 4 ? 21 : 24;
  const thickFromPlan = footingSideFt >= 12 ? 24 : footingSideFt >= 10 ? 21 : footingSideFt >= 8 ? 18 : 15;
  const footingThickIn = Math.max(thickFromStorey, thickFromPlan);
  const footingMeshCtc = footingMeshCtcMm(footingSideFt);
  const columnFactoredKn = serviceLoadKn * 1.5;

  let columnSizeIn = '12" x 12"';
  let columnSizeMm = '300 x 300 mm (Zone V minimum; do not use 9" x 9")';
  let columnBars = '6 nos 16 mm TMT Fe 500D';
  let columnWidthMm = 300;
  let columnDepthMm = 300;
  let columnBarCount = 6;
  let columnBarDiaMm = 16;
  if (storeys >= 5 || columnFactoredKn > 2100) {
    columnSizeIn = '15" x 18"';
    columnSizeMm = '380 x 450 mm';
    columnBars = '8 nos 20 mm TMT Fe 500D. Do not drop below 8 bars.';
    columnWidthMm = 380;
    columnDepthMm = 450;
    columnBarCount = 8;
    columnBarDiaMm = 20;
  } else if (storeys >= 4 || columnFactoredKn > 1650) {
    columnSizeIn = '15" x 15"';
    columnSizeMm = '380 x 380 mm';
    columnBars = '8 nos 20 mm TMT Fe 500D';
    columnWidthMm = 380;
    columnDepthMm = 380;
    columnBarCount = 8;
    columnBarDiaMm = 20;
  } else if (storeys >= 3 || columnFactoredKn > 1100) {
    columnSizeIn = '15" x 15"';
    columnSizeMm = '380 x 380 mm';
    columnBars = '8 nos 16 mm TMT Fe 500D';
    columnWidthMm = 380;
    columnDepthMm = 380;
    columnBarCount = 8;
  } else if (storeys >= 2 || columnFactoredKn > 700) {
    columnSizeIn = '12" x 15"';
    columnSizeMm = '300 x 380 mm';
    columnBars = '8 nos 16 mm TMT Fe 500D';
    columnWidthMm = 300;
    columnDepthMm = 380;
    columnBarCount = 8;
  }

  const columnFck = storeys >= 4 ? 25 : 20;
  const columnCapacityKn = shortColumnCapacityKn(
    columnWidthMm,
    columnDepthMm,
    columnBarCount,
    columnBarDiaMm,
    columnFck,
  );

  let plinthSize = '9" x 12" (230 x 300 mm)';
  let plinthBars = '4 nos 16 mm TMT (2 top + 2 bottom) - do not use 12 mm here';
  let plinthWidthMm = 230;
  let plinthDepthMm = 300;
  let plinthBarCount = 4;
  let plinthBarDiaMm = 16;
  if (storeys >= 4) {
    plinthSize = '12" x 15" (300 x 380 mm)';
    plinthBars = '6 nos 16 mm TMT (3 top + 3 bottom). Alternate: 4 nos 20 mm TMT';
    plinthWidthMm = 300;
    plinthDepthMm = 380;
    plinthBarCount = 6;
  } else if (storeys >= 2) {
    plinthSize = '9" x 15" (230 x 380 mm)';
    plinthBars = '6 nos 16 mm TMT (3 top + 3 bottom) for a 15-16 ft grade-beam span';
    plinthDepthMm = 380;
    plinthBarCount = 6;
  }

  const plinthStirrups =
    '8 mm 2-legged @ 100 mm c/c throughout (Zone V grade beam). 135-degree hooks. No 150-200 mm spacing.';

  const floorBeamSize = '12" x 18" (300 x 450 mm)';
  const floorBeamBars =
    'Bottom 3 nos 20 mm. Top 3 nos 20 mm. Same size both faces. Two bars of each face must run through the joint.';
  const typicalBeamNote =
    `Maximum clear span for this booklet is ${MAX_SPAN_FT} ft. Depth 18" is about span/10.5. Do not reduce it on site.`;
  const longBeamNote =
    `If a full-height 9" brick wall sits on this ${MAX_SPAN_FT} ft beam, use 12" x 21" (300 x 525 mm) with the same 3-20 mm bars. Clear span over ${MAX_SPAN_FT} ft, or a beam that carries another beam, is outside this booklet.`;
  const beamWidthMm = 300;
  const beamDepthMm = 450;
  const beamTopBars = 3;
  const beamTopDiaMm = 20;
  const beamBottomBars = 3;
  const beamBottomDiaMm = 20;
  const beamCapacityKnm = beamMomentCapacityKnm(beamWidthMm, beamDepthMm, beamTopBars, beamTopDiaMm, 20);

  const floorBeamStirrups =
    '8 mm 2-legged @ 100 mm c/c for 3 ft (about 2d) from each column face. Mid-span 8 mm @ 150 mm. 135-degree hooks. First stirrup within 50 mm of the column face.';

  const slabThk =
    '6" (150 mm) for 15-16 ft rooms. Main bars 10 mm @ 150 mm c/c. Distribution 8 mm @ 200 mm c/c.';

  const concreteGrade = storeys >= 4 ? 'M25 for columns and footings; M20 minimum for slab / beam' : 'M20 (1:1.5:3) minimum; M25 better for Zone V columns';

  return {
    columnCount,
    tributaryM2,
    serviceLoadKn,
    designLoadKn,
    footingSideFt,
    footingThickIn,
    columnSizeIn,
    columnSizeMm,
    columnBars,
    plinthSize,
    plinthBars,
    plinthStirrups,
    floorBeamSize,
    floorBeamBars,
    floorBeamStirrups,
    typicalBeamNote,
    longBeamNote,
    slabThk,
    concreteGrade,
    columnWidthMm,
    columnDepthMm,
    columnBarCount,
    columnBarDiaMm,
    beamWidthMm,
    beamDepthMm,
    beamTopBars,
    beamTopDiaMm,
    beamBottomBars,
    beamBottomDiaMm,
    plinthWidthMm,
    plinthDepthMm,
    plinthBarCount,
    plinthBarDiaMm,
    footingMeshCtcMm: footingMeshCtc,
    columnCapacityKn,
    columnFactoredKn,
    beamCapacityKnm,
    diagrams: {
      column: {
        widthMm: columnWidthMm,
        depthMm: columnDepthMm,
        barCount: columnBarCount,
        barDiaMm: columnBarDiaMm,
        coverMm: 40,
        tieDiaMm: 8,
        label: `${columnSizeIn} - ${columnBarCount} nos ${columnBarDiaMm} mm - cover 40 mm`,
      },
      beam: {
        widthMm: beamWidthMm,
        depthMm: beamDepthMm,
        topBars: beamTopBars,
        topDiaMm: beamTopDiaMm,
        bottomBars: beamBottomBars,
        bottomDiaMm: beamBottomDiaMm,
        coverMm: 25,
        stirrupDiaMm: 8,
        label: `12" x 18" - 3-20 mm top and bottom - max span ${MAX_SPAN_FT} ft`,
      },
      footing: {
        sideFt: footingSideFt,
        thickIn: footingThickIn,
        pccIn: 4,
        columnWidthMm,
        columnDepthMm,
        meshDiaMm: 12,
        meshSpacingMm: footingMeshCtc,
        coverMm: 50,
        label: `${footingSideFt.toFixed(1)} ft sq x ${footingThickIn}" - 12 mm @ ${footingMeshCtc} mm - cover 50 mm`,
      },
    },
  };
}

function barKgPerMetre(diaMm: number): number {
  return (diaMm * diaMm) / 162;
}

function estimateQuantities(
  analysis: HouseAnalysis,
  floorSqft: number,
  currentStoreys: number,
): ThumbRuleRow[] {
  const floorM2 = sqftToM2(Math.max(floorSqft, 600));
  const n = analysis.columnCount;
  const sideM = analysis.footingSideFt * 0.3048;
  const storeyH = 3;
  const footing = n * sideM * sideM * (analysis.footingThickIn * 0.0254);
  const pcc = n * sideM * sideM * 0.1;
  const perim = 4 * Math.sqrt(floorM2) * 1.12;
  const plinth = perim * (analysis.plinthWidthMm / 1000) * (analysis.plinthDepthMm / 1000);
  const columns = n * currentStoreys * storeyH * (analysis.columnWidthMm / 1000) * (analysis.columnDepthMm / 1000);
  const grid = Math.max(3, Math.round(Math.sqrt(n)));
  const buildingSide = Math.sqrt(floorM2);
  const beamLen = 2 * grid * buildingSide * currentStoreys;
  const beams = beamLen * (analysis.beamWidthMm / 1000) * (analysis.beamDepthMm / 1000);
  const slab = floorM2 * 0.15 * currentStoreys;
  const rcc = footing + plinth + columns + beams + slab;
  const cementBags = Math.round(rcc * 8.4 + pcc * 5.5);
  const sand = rcc * 0.45 + pcc * 0.45;
  const aggregate = rcc * 0.85 + pcc * 0.9;
  const brickM2 = perim * 2.7 * currentStoreys * 0.65;
  const bricks = Math.round(brickM2 * 52);

  const colSteel = n * currentStoreys * 3.15 * analysis.columnBarCount * barKgPerMetre(analysis.columnBarDiaMm);
  const colTies = n * currentStoreys * storeyH * (2 * (analysis.columnWidthMm + analysis.columnDepthMm) / 1000) / 0.12 * 0.395;
  const plinthSteel = perim * analysis.plinthBarCount * barKgPerMetre(analysis.plinthBarDiaMm);
  const beamSteel =
    beamLen *
    (analysis.beamTopBars * barKgPerMetre(analysis.beamTopDiaMm) +
      analysis.beamBottomBars * barKgPerMetre(analysis.beamBottomDiaMm));
  const slabSteel =
    floorM2 * currentStoreys * ((1 / 0.15) * barKgPerMetre(10) + (1 / 0.2) * barKgPerMetre(8));
  const footingSteel =
    n * 2 * (sideM / (analysis.footingMeshCtcMm / 1000)) * sideM * barKgPerMetre(12);
  const steel = colSteel + colTies + plinthSteel + beamSteel + slabSteel + footingSteel;

  return [
    {
      label: 'What this covers',
      value: `Foundation for the future floors. Frame, slab and walls for the ${currentStoreys} storey(s) being built now. Plus or minus about 20%.`,
    },
    { label: 'RCC concrete', value: `About ${rcc.toFixed(1)} cubic metres (footings, plinth, columns, beams, slabs)` },
    { label: 'PCC (plain concrete)', value: `About ${pcc.toFixed(1)} cubic metres under footings` },
    { label: 'TMT steel', value: `About ${Math.round(steel / 10) * 10} kg (order 10-15% extra for laps, chairs and wastage)` },
    { label: 'Cement', value: `About ${cementBags} bags of 50 kg (M20 mix). Keep extras dry.` },
    { label: 'Sand', value: `About ${sand.toFixed(1)} cubic metres` },
    { label: 'Stone aggregate', value: `About ${aggregate.toFixed(1)} cubic metres (20 mm down)` },
    { label: 'Bricks (if 9" outer walls)', value: `About ${bricks.toLocaleString('en-IN')} nos - only a check figure` },
    {
      label: 'How to use this',
      value: 'Ask your Mistri for a written material list and compare. Large gaps mean someone is guessing or cutting size.',
    },
  ];
}

function foundationDepthLabel(storeys: number, projectDepthFt: number | null): string {
  if (projectDepthFt && projectDepthFt > 0) {
    return `${projectDepthFt} ft as entered on this project. Still reach hard strata / check water table (minimum usually 4 ft below GL).`;
  }
  if (storeys <= 2) return 'Minimum 4 ft (1.2 m) below existing ground, or to hard strata';
  if (storeys === 3) return 'Minimum 5 ft (1.5 m) below existing ground, or to hard strata';
  return 'Minimum 6 ft (1.8 m) below GL for G+3 and above. Soil test recommended in Assam alluvium.';
}

function looseMistriDetails(raw: unknown): MistriDetails | null {
  const parsed = parseMistriDetails(raw);
  if (parsed) return parsed;
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const area =
    typeof record.approximateAreaSqft === 'number' && record.approximateAreaSqft > 0
      ? record.approximateAreaSqft
      : 0;
  return {
    civilWorkTypes: Array.isArray(record.civilWorkTypes)
      ? (record.civilWorkTypes as MistriDetails['civilWorkTypes'])
      : [],
    approximateAreaSqft: area,
    currentFloorPlan: typeof record.currentFloorPlan === 'string' ? record.currentFloorPlan : null,
    futureFloorPlan: typeof record.futureFloorPlan === 'string' ? record.futureFloorPlan : null,
    contractType: null,
    projectStartTimeType: '1week',
    floorWork: Array.isArray(record.floorWork)
      ? (record.floorWork as MistriDetails['floorWork'])
      : null,
    boundaryWallDetails:
      record.boundaryWallDetails && typeof record.boundaryWallDetails === 'object'
        ? (record.boundaryWallDetails as MistriDetails['boundaryWallDetails'])
        : null,
    brickworkDetails:
      record.brickworkDetails && typeof record.brickworkDetails === 'object'
        ? (record.brickworkDetails as MistriDetails['brickworkDetails'])
        : null,
  };
}

export function buildMistriThumbRulesGuide(
  project: MistriThumbRulesProjectInput,
): MistriThumbRulesGuide {
  const mistri = looseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  const typicalFloor = typicalFloorAreaSqft(project, mistri);
  const currentUpper = floorPlanUpperCount(mistri?.currentFloorPlan);
  const futureUpper = floorPlanUpperCount(mistri?.futureFloorPlan);
  const currentStoreys = storeysFromGPlus(currentUpper, project.total_floors);
  const designStoreys = storeysFromGPlus(
    futureUpper != null ? Math.max(futureUpper, currentUpper ?? 0) : currentUpper,
    project.total_floors,
  );
  const builtUp = builtUpAreaSqft(mistri, typicalFloor, currentStoreys);
  const rcc = hasRccContext(project, mistri);
  const assam = hasAssamMistriFloorWork(mistri);
  const assamOnly = assam && !rcc;
  const frame = hasFrameScope(mistri) || rcc;
  const projectDepth = assamFoundationDepthFt(mistri);
  const roof = assamRoofSummary(mistri?.floorWork);
  const analysis = analyzeHouse(typicalFloor || 1000, designStoreys);
  const generatedAtLabel = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const snapshotRows: ThumbRuleRow[] = [
    { label: 'Project', value: project.title?.trim() || 'Mistri project' },
    { label: 'Site', value: siteAddress(project) },
    { label: 'Building type', value: assamOnly ? 'Assam Type' : rcc ? 'RCC' : project.track_type },
    { label: 'Typical / plinth area', value: formatSqft(typicalFloor) },
    { label: 'Approx. built-up (all floors)', value: formatSqft(builtUp) },
    { label: 'Current floors', value: floorPlanLabel(mistri?.currentFloorPlan, currentStoreys) },
    {
      label: 'Foundation sized for',
      value: floorPlanLabel(mistri?.futureFloorPlan ?? mistri?.currentFloorPlan, designStoreys),
    },
    { label: 'Seismic zone', value: SEISMIC_ZONE_LABEL },
    { label: 'Maximum RCC span', value: `${SPAN_LABEL} ft clear. Rooms longer than ${MAX_SPAN_FT} ft are outside this booklet.` },
  ];

  const analysisRows: ThumbRuleRow[] = [
    {
      label: 'Method',
      value:
        `Approximate gravity + seismic check. Every RCC beam and slab is designed for a ${SPAN_LABEL} ft clear span. No architectural drawing, so a regular grid at that spacing is assumed.`,
    },
    {
      label: 'Assumed grid',
      value: `${analysis.columnCount} columns, about ${analysis.tributaryM2.toFixed(1)} sq. m tributary each (${SPAN_LABEL} ft / 4.6-4.9 m).`,
    },
    {
      label: 'Floor load used',
      value: `${FLOOR_LOAD_KN_M2} kN/sq. m (150 mm slab 3.75 + finish 1.5 + partitions 1 + live 2 + beam/wall share ~5.8).`,
    },
    {
      label: 'Service load / column',
      value: `About ${Math.round(analysis.serviceLoadKn)} kN for ${designStoreys} storeys on this plinth area (includes 10% uncertainty).`,
    },
    {
      label: 'Column check (IS 456 short column)',
      value: `Factored ${Math.round(analysis.columnFactoredKn)} kN vs capacity ${Math.round(analysis.columnCapacityKn)} kN (${analysis.columnSizeIn}, ${analysis.columnBarCount}-${analysis.columnBarDiaMm} mm, ${designStoreys >= 4 ? 'M25' : 'M20'}).`,
    },
    {
      label: 'Beam check (16 ft continuous)',
      value: `Support moment about 120 kNm for a normal house load. ${analysis.floorBeamSize} with 3-20 mm gives about ${analysis.beamCapacityKnm.toFixed(0)} kNm. 3-16 mm would be about 93 kNm - too little.`,
    },
    {
      label: 'Slab check (two-way on beams)',
      value: `150 mm slab, d about 125 mm. Two-way moment about 16 kNm/m; 10 mm @ 150 mm gives about 25 kNm/m. If the slab has beams on only two sides (one-way), use 10 mm @ 125 mm.`,
    },
    {
      label: 'Footing load (Zone V)',
      value: `About ${Math.round(analysis.designLoadKn)} kN after 1.15 seismic / settlement factor.`,
    },
    {
      label: 'Assumed SBC',
      value: `${SBC_KN_M2} kN/sq. m (medium Assam alluvium, no soil report). Soft soil needs a larger footing.`,
    },
    {
      label: 'Required footing plan',
      value: `${analysis.footingSideFt.toFixed(1)} ft x ${analysis.footingSideFt.toFixed(1)} ft x ${analysis.footingThickIn}" from P/SBC. Mesh 12 mm @ ${analysis.footingMeshCtcMm} mm. Combine if columns are closer than 6 ft.`,
    },
  ];

  const seismicRows: ThumbRuleRow[] = [
    {
      label: 'Why Zone V',
      value:
        'Assam is IS 1893 Seismic Zone V. India has no Zone VI. Detailing follows IS 13920 ductile detailing as for the highest Indian zone.',
    },
    {
      label: 'Tie the building',
      value:
        'Continuous plinth / grade beam through every footing. Continuous lintel / roof band. No floating columns. No offset columns without an engineer.',
    },
    {
      label: 'Column confinement',
      value:
        '8 mm ties @ 100 mm c/c in the confinement zone (larger of column depth, 450 mm, or 1/6 clear height from each joint). Mid-height 8 mm @ 150 mm. 135-degree hooks.',
    },
    {
      label: 'Beam confinement',
      value:
        '8 mm stirrups @ 100 mm c/c for 2 times beam depth from each column face (about 3 ft on this 18" beam). Two of the three 20 mm bars on each face must run through the joint.',
    },
    {
      label: 'Do not do this',
      value:
        'Do not use 4 nos 12 mm in the plinth. Do not use 9" x 9" columns. Do not cut the floor beam below 12" x 18" or drop below 3 nos 20 mm each face. Do not lap bars in the joint or at mid-span beam bottom.',
    },
  ];

  const foundationRows: ThumbRuleRow[] = [
    { label: 'Foundation type', value: 'Isolated column footings + continuous plinth / grade beam tying every footing' },
    { label: 'Founding depth', value: foundationDepthLabel(designStoreys, projectDepth) },
    {
      label: 'Footing size (this job)',
      value: `${analysis.footingSideFt.toFixed(1)} ft x ${analysis.footingSideFt.toFixed(1)} ft x ${analysis.footingThickIn}" (from load / SBC above)`,
    },
    { label: 'PCC below footing', value: '4" (100 mm) PCC 1:4:8' },
    { label: 'Footing concrete', value: analysis.concreteGrade },
    { label: 'Footing steel (thumb)', value: `12 mm mesh @ ${analysis.footingMeshCtcMm} mm c/c both ways, extra 12 mm across the column. Cover 50 mm.` },
    { label: 'Plinth beam size', value: analysis.plinthSize },
    { label: 'Plinth beam steel', value: analysis.plinthBars },
    { label: 'Plinth stirrups', value: analysis.plinthStirrups },
    {
      label: 'Plinth height',
      value: 'Minimum 1.5-2 ft (450-600 mm) above existing ground / road level',
    },
  ];

  const columnRows: ThumbRuleRow[] = frame
    ? [
        { label: 'Column size (this job)', value: `${analysis.columnSizeIn} (${analysis.columnSizeMm})` },
        { label: 'Main bars', value: analysis.columnBars },
        {
          label: 'Ties',
          value:
            '8 mm ties @ 100 mm c/c in confinement zone; 8 mm @ 150 mm at mid-height. 135-degree hooks. Every tie must hold a bar.',
        },
        {
          label: 'Why this size',
          value: `Sized for ${designStoreys} storeys, ${formatSqft(typicalFloor)} typical floor, Zone V. Future floors entered on the project control this, not only the floor being built now.`,
        },
      ]
    : [
        {
          label: 'RCC frame',
          value: 'No full RCC frame selected. If a frame is added later, use the Zone V sizes in this sheet.',
        },
      ];

  const beamRows: ThumbRuleRow[] = frame
    ? [
        { label: 'Design span', value: `Maximum ${MAX_SPAN_FT} ft clear. Depth 18" is about span/10.5. IS 456 continuous L/d is satisfied. 24" (span/8) is only for transfer / heavy beams.` },
        { label: 'Floor beam size', value: `${analysis.floorBeamSize}. ${analysis.typicalBeamNote}` },
        { label: 'Main steel', value: analysis.floorBeamBars },
        { label: 'Stirrups', value: analysis.floorBeamStirrups },
        { label: 'Wall on the beam / longer span', value: analysis.longBeamNote },
        {
          label: 'Why this size',
          value:
            `At ${MAX_SPAN_FT} ft, factored support moment is about 120 kNm for slab + finish + live + a light wall share. 3-20 mm in 300 x 450 mm M20 gives about ${analysis.beamCapacityKnm.toFixed(0)} kNm. Keep the same 3 bars on top and bottom so they can be counted on site.`,
        },
        {
          label: 'Lintel / sunshade',
          value:
            'Lintel band continuous: 6" x 9" (150 x 230 mm), 2 nos 12 mm + 8 mm stirrups @ 100-150 mm. Sunshade 3" (75 mm).',
        },
      ]
    : [
        {
          label: 'Beams',
          value: 'Provide a continuous lintel band 6" x 9" with 2 nos 12 mm even if there is no full RCC frame.',
        },
      ];

  const slabRows: ThumbRuleRow[] =
    frame && !assamOnly
      ? [
          { label: 'Slab thickness', value: analysis.slabThk },
          {
            label: 'Slab steel',
            value: 'Main bars 10 mm @ 150 mm c/c. Distribution 8 mm @ 200 mm c/c. Do not drop to 8 mm main on a 16 ft room.',
          },
          {
            label: 'Extra steel',
            value: 'Extra top bars 10 mm at supports for L/4. Extra around openings and sunken toilets. Corner torsion steel.',
          },
          { label: 'Staircase waist', value: '6" (150 mm) waist slab; riser 6"-7", tread 10"-12"' },
        ]
      : [
          {
            label: 'RCC slab',
            value: assamOnly
              ? 'Assam Type roof is not a typical RCC floor slab. See Assam roof notes below. Foundation still follows Zone V.'
              : 'No RCC slab selected. If a slab is added, use 150 mm with 10 mm @ 150 mm for 15-16 ft rooms.',
          },
        ];

  const steelRows: ThumbRuleRow[] = [
    { label: 'Steel grade', value: 'TMT Fe 500D. Do not mix rusted or undersized bars.' },
    { label: 'Lap length', value: 'Tension lap 50 x bar dia (Zone V). Stagger laps. No lap in the joint or at mid-span beam bottom.' },
    {
      label: 'Development',
      value: 'Column starter bars 50 x dia into the footing. Beam bars through the joint with standard 90-degree hook if they stop.',
    },
    {
      label: 'Chairs / cover blocks',
      value: 'Use proper cover blocks. Slab chairs so the top mesh cannot sink during concreting.',
    },
  ];

  const coverRows: ThumbRuleRow[] = [
    { label: 'Slab clear cover', value: '20 mm' },
    { label: 'Beam / plinth clear cover', value: '25 mm' },
    { label: 'Column clear cover', value: '40 mm' },
    { label: 'Footing clear cover', value: '50 mm' },
    { label: 'RCC concrete grade', value: analysis.concreteGrade },
    { label: 'Curing', value: 'Keep wet for 10-14 days (Assam heat / humidity)' },
  ];

  const masonryRows: ThumbRuleRow[] = [];
  if (hasBrickScope(mistri) || hasPlasterScope(mistri) || hasBoundaryScope(mistri) || hasFlooringScope(mistri)) {
    const brick =
      mistri?.floorWork?.find((floor) => floor.brickMaterial)?.brickMaterial ??
      mistri?.brickworkDetails?.materialType;
    masonryRows.push({
      label: 'Wall thickness',
      value:
        brick === 'aac_block'
          ? 'AAC: external 6"-8" (150-200 mm), internal 4" (100 mm). Tie to columns with bars / bands.'
          : 'Red brick: external 9" (230 mm), internal 4.5" (115 mm). Toothed / tied to RCC columns.',
    });
    masonryRows.push({
      label: 'Seismic walls',
      value: 'Do not leave full-height unrestrained walls. Provide lintel band and, if walls are long, a sill band.',
    });
    if (hasPlasterScope(mistri)) {
      masonryRows.push({
        label: 'Plaster',
        value: 'Internal 12-15 mm (1:6). External 15-20 mm (1:4 to 1:6). Two coats on RCC / AAC.',
      });
    }
    if (hasFlooringScope(mistri)) {
      masonryRows.push({
        label: 'Flooring bed',
        value: '25-40 mm bedding mortar for tiles / marble. Wet-area slope 1:60 to 1:80.',
      });
    }
    if (hasBoundaryScope(mistri) && mistri?.boundaryWallDetails) {
      const thickness =
        mistri.boundaryWallDetails.thickness === '3_inch' ? '3" (75 mm)' : '5" (125 mm)';
      masonryRows.push({
        label: 'Boundary wall',
        value: `${thickness} ${mistri.boundaryWallDetails.structureType === 'half_grill' ? 'half-grill' : 'full solid'}. Intermediate 9" x 12" columns every 8 ft, 3 ft foundation, plinth band.`,
      });
    }
  }

  const assamRows: ThumbRuleRow[] = [];
  if (assam) {
    assamRows.push({
      label: 'Assam Type note',
      value:
        'Light roof house: still size foundation, plinth beam and posts for the future floors and Zone V. Do not rest a heavy RCC slab on Assam walls without an engineer.',
    });
    if (roof) {
      assamRows.push({ label: 'Roof on this project', value: roof });
    }
    assamRows.push({
      label: 'Truss / purlin (thumb)',
      value:
        'Steel truss: rafters about 75 x 40 mm or as designed, purlins 2-3 ft c/c, bracings both ways. Wood truss: treat against moisture / termite. Anchor to plinth / ring beam.',
    });
    assamRows.push({
      label: 'Posts / walls',
      value: 'Hold posts plumb. Provide cross bracings. Tie walls to the plinth beam.',
    });
  }

  const checklistRows: ThumbRuleRow[] = [
    { label: 'Before casting', value: 'Check cover, bar count, 135-degree hooks, and lap positions with the Mistri and owner together.' },
    { label: 'Column alignment', value: 'Columns must stay in one line plumb from footing to terrace.' },
    { label: 'Sleeves', value: 'Fix water / electrical sleeves in slab and beam before concrete. Do not chase a structural beam later.' },
    { label: 'This sheet', value: 'Site guidance from an approximate check. Not a signed structural drawing or bar-bending schedule.' },
  ];

  const clientSummaryRows: ThumbRuleRow[] = [
    {
      label: 'In one line',
      value: `${formatSqft(typicalFloor)} house, ${floorPlanLabel(mistri?.currentFloorPlan, currentStoreys)} now, foundation ready for ${floorPlanLabel(mistri?.futureFloorPlan ?? mistri?.currentFloorPlan, designStoreys)}. Max RCC room span ${MAX_SPAN_FT} ft. Assam earthquake Zone V.`,
    },
    {
      label: 'What the owner should remember',
      value: `Floor beams ${analysis.floorBeamSize}, 3 nos 20 mm top and bottom, for 15-16 ft rooms. Plinth ${analysis.plinthBars.split('.')[0]}. Columns ${analysis.columnSizeIn} with ${analysis.columnBarCount} nos ${analysis.columnBarDiaMm} mm.`,
    },
    {
      label: 'What this PDF is',
      value: 'A shared site booklet so you and the Head Mason talk in the same numbers. It is not a municipal drawing and not a signed structural design.',
    },
    {
      label: 'What you do on site',
      value: 'Before every casting, count bars, check cover blocks, and match the sketches. If the Mistri wants a smaller size, stop and ask why.',
    },
  ];

  const howToRows: ThumbRuleRow[] = [
    { label: 'Black dots', value: 'Main steel bars in the cross-section sketches' },
    { label: 'Teal line', value: 'Stirrup / column tie / footing mesh' },
    { label: 'Cover', value: 'Clear gap from the outer concrete face to the bar. Never skip cover blocks.' },
    { label: 'c/c', value: 'Centre to centre spacing of bars or stirrups' },
    { label: 'Pages', value: 'Start with "In simple words", then sketches, then the detailed tables.' },
  ];

  const scheduleRows: ThumbRuleRow[] = [
    { label: 'Footing', value: `${analysis.footingSideFt.toFixed(1)} ft square x ${analysis.footingThickIn}" thick. 12 mm mesh @ ${analysis.footingMeshCtcMm} mm both ways. Cover 50 mm.` },
    { label: 'Plinth / grade beam', value: `${analysis.plinthSize}. ${analysis.plinthBars}. Stirrups 8 mm @ 100 mm. Cover 25 mm.` },
    { label: 'Column', value: `${analysis.columnSizeIn}. ${analysis.columnBars}. Ties 8 mm @ 100 / 150 mm. Cover 40 mm.` },
    { label: 'Floor beam (15-16 ft span)', value: `${analysis.floorBeamSize}. ${analysis.floorBeamBars} Stirrups 8 mm @ 100 mm near ends, 150 mm mid-span. Cover 25 mm.` },
    { label: 'Wall on beam / over 16 ft', value: analysis.longBeamNote },
    { label: 'Slab', value: `${analysis.slabThk} Cover 20 mm.` },
  ];

  const quantityRows = estimateQuantities(analysis, typicalFloor || 1000, currentStoreys);

  const stageRows: ThumbRuleRow[] = [
    { label: '1. Layout', value: 'Mark the plot, column grid and founding depth. Keep the building square.' },
    { label: '2. Excavation + PCC', value: 'Reach the depth in this booklet. Lay 4" PCC 1:4:8 and let it set.' },
    { label: '3. Footings', value: 'Place mesh with 50 mm cover. Cast footings. Keep column starter bars in the exact grid.' },
    { label: '4. Plinth beam', value: 'Tie every footing with the grade beam. Same day or next, but bars must be continuous.' },
    { label: '5. Columns', value: 'Raise columns storey by storey. Do not offset them. Confinement ties at every joint.' },
    { label: '6. Beams and slab', value: 'Fix chairs, extra top steel, and sleeves before the mixer arrives.' },
    { label: '7. Walls + curing', value: 'Brickwork after the slab has cured. Keep concrete wet 10-14 days.' },
  ];

  const ownerCheckRows: ThumbRuleRow[] = [
    { label: 'Footing day', value: 'Is the pit deep enough? Is PCC visible? Can you see 50 mm cover under the mesh?' },
    { label: 'Plinth day', value: `Count ${analysis.plinthBarCount} bars of ${analysis.plinthBarDiaMm} mm. Stirrups should be 100 mm, not 200 mm.` },
    { label: 'Column day', value: `Count ${analysis.columnBarCount} bars of ${analysis.columnBarDiaMm} mm. Size ${analysis.columnSizeIn}. Ties need 135-degree hooks.` },
    { label: 'Beam day', value: `Depth 18" (450 mm), not less. Count 3 nos 20 mm on top and 3 nos 20 mm at the bottom. Stirrups 8 mm @ 100 mm near the columns.` },
    { label: 'Slab day', value: '150 mm thick. Main 10 mm @ 150 mm on chairs. Extra 10 mm top at supports. Pipes already in place.' },
    { label: 'After casting', value: 'Start curing the same evening. Honeycomb or tilted columns need an engineer, not a plaster cover-up.' },
  ];

  const redFlagRows: ThumbRuleRow[] = [
    { label: 'Call an engineer if', value: 'Soil is very soft, water stands in the pit, or neighbouring houses have settlement cracks.' },
    { label: 'Plan is not simple', value: `L-shape, clear span over ${MAX_SPAN_FT} ft, floating column, or a floor higher than this booklet allows.` },
    { label: 'Someone reduces steel', value: 'Any request to use 12 mm in the plinth, 9" x 9" columns, a beam shallower than 18", or fewer than 3-20 mm in the floor beam.' },
    { label: 'Extra floor later', value: `This foundation is for ${floorPlanLabel(mistri?.futureFloorPlan ?? mistri?.currentFloorPlan, designStoreys)}. Going higher needs a new design.` },
  ];

  const glossaryRows: ThumbRuleRow[] = [
    { label: 'TMT / Fe 500D', value: 'Ribbed steel bar used today. Fe 500D is the grade to ask for.' },
    { label: 'Cover', value: 'Gap from concrete face to bar. It protects steel from rust and fire.' },
    { label: 'Stirrup / tie', value: 'Closed hoop that holds the long bars. 135-degree hook for earthquakes.' },
    { label: 'Plinth / grade beam', value: 'Beam at ground that ties all footings so the house moves as one in a quake.' },
    { label: 'SBC', value: 'Safe bearing capacity of soil. We assumed 125 kN/sq. m because there is no soil test.' },
    { label: 'M20 / M25', value: 'Concrete strength. M25 is richer (more cement) and better for tall Zone V columns.' },
    { label: 'c/c', value: 'Centre-to-centre spacing. 8 mm @ 100 mm c/c means a stirrup every 100 mm.' },
    { label: 'Lap', value: 'Where two bars join. Keep laps away from the middle of a beam bottom and away from joints.' },
  ];

  return {
    projectId: project.id,
    numericProjectId:
      project.numeric_id?.trim() && /^[0-9]{6}$/.test(project.numeric_id.trim())
        ? project.numeric_id.trim()
        : '',
    projectTitle: project.title?.trim() || 'Mistri project',
    siteAddress: siteAddress(project),
    generatedAtLabel,
    snapshotRows,
    analysisRows,
    seismicRows,
    foundationRows,
    columnRows,
    beamRows,
    slabRows,
    steelRows,
    coverRows,
    masonryRows,
    assamRows,
    checklistRows,
    clientSummaryRows,
    howToRows,
    scheduleRows,
    quantityRows,
    stageRows,
    ownerCheckRows,
    redFlagRows,
    glossaryRows,
    diagrams: analysis.diagrams,
    isAssamOnly: assamOnly,
    hasRccFrame: frame && !assamOnly,
    disclaimer:
      `Approximate practical sizes for a regular Assam house using IS 456, IS 1893 Zone V and IS 13920 detailing. Maximum RCC clear span taken as ${MAX_SPAN_FT} ft. SBC assumed ${SBC_KN_M2} kN/sq. m. This is NOT a signed structural design. Soft soil, irregular plans, spans over ${MAX_SPAN_FT} ft, or floating columns need a licensed structural engineer before casting.`,
  };
}
