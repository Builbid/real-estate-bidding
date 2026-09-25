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
  isAssamOnly: boolean;
  hasRccFrame: boolean;
  disclaimer: string;
}

/** Assam / NE India is IS 1893 Zone V. There is no official Zone VI - use Zone V + IS 13920. */
const SEISMIC_ZONE_LABEL = 'IS 1893 Zone V (Assam / North-East) - design as highest Indian zone';
const FLOOR_LOAD_KN_M2 = 13;
const SBC_KN_M2 = 125;
const SEISMIC_FOOTING_FACTOR = 1.15;
const TYPICAL_TRIBUTARY_M2 = 12;

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
  return Math.max(9, Math.min(25, raw));
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
  slabThk: string;
  concreteGrade: string;
}

function analyzeHouse(floorSqft: number, storeys: number): HouseAnalysis {
  const columnCount = estimatedColumnCount(floorSqft);
  const tributaryM2 = sqftToM2(Math.max(floorSqft, 600)) / columnCount;
  const serviceLoadKn = columnServiceLoadKn(floorSqft, storeys, columnCount);
  const designLoadKn = serviceLoadKn * SEISMIC_FOOTING_FACTOR;
  const sideM = Math.sqrt(designLoadKn / SBC_KN_M2);
  const footingSideFt = Math.max(4, roundHalfFt(sideM * 3.28084));
  const footingThickIn = storeys <= 1 ? 12 : storeys === 2 ? 15 : storeys === 3 ? 18 : storeys === 4 ? 21 : 24;
  const heavy = floorSqft >= 1500;

  let columnSizeIn = '12" x 12"';
  let columnSizeMm = '300 x 300 mm';
  let columnBars = '6 nos 16 mm TMT Fe 500D';
  if (storeys <= 1 && !heavy) {
    columnSizeIn = '12" x 12"';
    columnSizeMm = '300 x 300 mm (Zone V minimum; do not use 9" x 9")';
    columnBars = '4 nos 16 mm TMT Fe 500D (prefer 6 nos 16 mm)';
  } else if (storeys <= 2 && !heavy) {
    columnSizeIn = '12" x 12"';
    columnSizeMm = '300 x 300 mm';
    columnBars = '6 nos 16 mm TMT Fe 500D';
  } else if (storeys <= 3 && !heavy) {
    columnSizeIn = '12" x 15"';
    columnSizeMm = '300 x 380 mm';
    columnBars = '8 nos 16 mm TMT Fe 500D';
  } else if (storeys <= 3 || (storeys === 4 && !heavy)) {
    columnSizeIn = '15" x 15"';
    columnSizeMm = '380 x 380 mm';
    columnBars = storeys >= 4 ? '8 nos 20 mm TMT Fe 500D' : '8 nos 16 mm TMT Fe 500D';
  } else if (storeys === 4) {
    columnSizeIn = '15" x 15"';
    columnSizeMm = '380 x 380 mm';
    columnBars = '8 nos 20 mm TMT Fe 500D';
  } else {
    columnSizeIn = '15" x 18"';
    columnSizeMm = '380 x 450 mm';
    columnBars = '8 nos 20 mm TMT Fe 500D (add 4 extra 16 mm if spans are long)';
  }

  let plinthSize = '9" x 12" (230 x 300 mm)';
  let plinthBars = '4 nos 16 mm TMT (2 top + 2 bottom) - do not use 12 mm here';
  if (storeys >= 4 || (storeys >= 3 && heavy)) {
    plinthSize = '12" x 15" (300 x 380 mm)';
    plinthBars = '6 nos 16 mm TMT (3 top + 3 bottom). Alternate: 4 nos 20 mm TMT';
  } else if (storeys >= 2 || heavy) {
    plinthSize = '9" x 15" (230 x 380 mm)';
    plinthBars = '4 nos 16 mm TMT (2 top + 2 bottom). Prefer 6 nos 16 mm if soil is soft';
  }

  const plinthStirrups =
    '8 mm 2-legged @ 100 mm c/c throughout (Zone V grade beam). 135-degree hooks. No 150-200 mm spacing.';

  let floorBeamSize = '9" x 12" (230 x 300 mm) for rooms up to 12 ft. Depth about span/12.';
  let floorBeamBars = 'Bottom 2 nos 16 mm + top 2 nos 16 mm continuous through the joint';
  if (storeys >= 4 || heavy) {
    floorBeamSize = '12" x 18" (300 x 450 mm) typical. Long hall: depth = span/12.';
    floorBeamBars = 'Bottom 2 nos 20 mm + 1 no 16 mm; top 2 nos 16 mm continuous through the joint';
  } else if (storeys >= 3) {
    floorBeamSize = '9" x 15" (230 x 380 mm) typical; long-span 12" x 18". Depth about span/12.';
    floorBeamBars = 'Bottom 2 nos 16 mm + 1 no 16 mm if span > 12 ft; top 2 nos 16 mm continuous';
  }

  const floorBeamStirrups =
    '8 mm 2-legged @ 100 mm c/c for 2d from each column face (confinement). Mid-span 8 mm @ 150 mm. 135-degree hooks.';

  const slabThk =
    floorSqft >= 1800 || storeys >= 3
      ? '5" to 6" (125-150 mm). Use 150 mm where room span exceeds 12 ft.'
      : '5" (125 mm) for rooms up to 12 ft span. Use 150 mm for larger halls.';

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
    slabThk,
    concreteGrade,
  };
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
  ];

  const analysisRows: ThumbRuleRow[] = [
    {
      label: 'Method',
      value:
        'Approximate gravity + seismic check for a regular house grid. No architectural drawing, so spans and exact column positions are assumed.',
    },
    {
      label: 'Assumed grid',
      value: `${analysis.columnCount} columns, about ${analysis.tributaryM2.toFixed(1)} sq. m tributary each (3.3-3.6 m spacing).`,
    },
    {
      label: 'Floor load used',
      value: `${FLOOR_LOAD_KN_M2} kN/sq. m (125 mm slab + finish + partitions + 2 kN live + wall share).`,
    },
    {
      label: 'Service load / column',
      value: `About ${Math.round(analysis.serviceLoadKn)} kN for ${designStoreys} storeys on this plinth area.`,
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
      value: `${analysis.footingSideFt.toFixed(1)} ft x ${analysis.footingSideFt.toFixed(1)} ft x ${analysis.footingThickIn}" from P/SBC. Isolated footing; combine if columns are closer than 6 ft.`,
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
        '8 mm stirrups @ 100 mm c/c for 2 times beam depth from each column face. Two bars top and two bars bottom must run through the joint.',
    },
    {
      label: 'Do not do this',
      value:
        'Do not use 4 nos 12 mm in the plinth beam for G+1 and above. Do not use 9" x 9" columns. Do not lap bars in the joint or at mid-span beam bottom.',
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
    { label: 'Footing steel (thumb)', value: '12 mm mesh @ 150 mm c/c both ways, extra 12 mm across the column. Cover 50 mm.' },
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
        { label: 'Typical floor beam', value: analysis.floorBeamSize },
        { label: 'Main steel', value: analysis.floorBeamBars },
        { label: 'Stirrups', value: analysis.floorBeamStirrups },
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
            value:
              'Main bars 8 mm @ 150 mm c/c (or 10 mm @ 200 mm for longer spans). Distribution 8 mm @ 200 mm c/c.',
          },
          {
            label: 'Extra steel',
            value: 'Extra top bars 8 mm at supports for L/4. Extra around openings and sunken toilets. Corner torsion steel.',
          },
          { label: 'Staircase waist', value: '6" (150 mm) waist slab; riser 6"-7", tread 10"-12"' },
        ]
      : [
          {
            label: 'RCC slab',
            value: assamOnly
              ? 'Assam Type roof is not a typical RCC floor slab. See Assam roof notes below. Foundation still follows Zone V.'
              : 'No RCC slab selected. If a slab is added, use 125-150 mm with 8 mm @ 150 mm as a starting rule.',
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
    isAssamOnly: assamOnly,
    hasRccFrame: frame && !assamOnly,
    disclaimer:
      'Approximate practical sizes for a regular Assam house using IS 456, IS 1893 Zone V and IS 13920 detailing. No room-by-room drawing was available, so a standard 3.3-3.6 m grid and 125 kN/sq. m SBC were assumed. This is NOT a signed structural design. Soft soil, irregular plans, long spans, or floating columns need a licensed structural engineer before casting.',
  };
}
