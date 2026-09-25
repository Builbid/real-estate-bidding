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

function siteAddress(project: MistriThumbRulesProjectInput): string {
  const parts = [project.district?.trim(), project.state?.trim(), project.pincode?.trim()].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(', ') : '—';
}

function formatSqft(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return `${Math.round(value).toLocaleString('en-IN')} sq. ft.`;
}

function storeysFromGPlus(upper: number | null, fallbackFloors?: number | null): number {
  if (upper != null && upper >= 0) return upper + 1;
  if (fallbackFloors && fallbackFloors > 0) return fallbackFloors;
  return 1;
}

function floorPlanLabel(value: string | null | undefined, storeys: number): string {
  const upper = floorPlanUpperCount(value);
  if (upper === 0) return 'G+0 (ground floor only)';
  if (upper != null) return `G+${upper} (${storeys} storey${storeys === 1 ? '' : 's'})`;
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
  if (slabAreas.length > 0) {
    return Math.max(...slabAreas);
  }
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

function columnSize(storeys: number, typicalFloor: number): string {
  const heavy = typicalFloor >= 1200;
  if (storeys <= 1) {
    return heavy
      ? '9" x 12" (230 x 300 mm)'
      : '9" x 9" (230 x 230 mm) minimum; prefer 9" x 12" (230 x 300 mm)';
  }
  if (storeys === 2) return '9" x 12" (230 x 300 mm)';
  if (storeys === 3) return heavy ? '12" x 15" (300 x 380 mm)' : '12" x 12" (300 x 300 mm)';
  if (storeys === 4) return '12" x 15" (300 x 380 mm)';
  return '15" x 15" (380 x 380 mm) or as per structural drawing';
}

function columnBars(storeys: number): string {
  if (storeys <= 1) return '4 - 12 mm HYSD (Fe 500) minimum';
  if (storeys === 2) return '4 - 16 mm HYSD (Fe 500)';
  if (storeys === 3) return '6 - 16 mm HYSD (Fe 500)';
  if (storeys === 4) return '6 - 20 mm or 8 - 16 mm HYSD (Fe 500)';
  return '8 - 20 mm HYSD - confirm with structural drawing';
}

function beamSize(storeys: number, typicalFloor: number): string {
  if (storeys <= 2 && typicalFloor < 1500) {
    return '9" x 12" (230 x 300 mm) for rooms up to ~12 ft span. Beam depth about span / 12.';
  }
  if (storeys <= 3) {
    return '9" x 15" (230 x 380 mm) typical; long-span / heavy beams 12" x 18" (300 x 450 mm). Depth about span / 12.';
  }
  return '12" x 18" (300 x 450 mm) typical. Always check depth about span / 12.';
}

function beamMainBars(storeys: number): string {
  if (storeys <= 1) return 'Bottom 2-16 mm + top 2-12 mm HYSD';
  if (storeys === 2) return 'Bottom 2-16 mm (add 1-16 mm if span > 12 ft) + top 2-12 mm HYSD';
  return 'Bottom 2-20 mm + 1-16 mm; top 2-16 mm at supports';
}

function slabThickness(typicalFloor: number): string {
  if (typicalFloor >= 1800) {
    return '5"-6" (125-150 mm). Use 150 mm where room span exceeds 12 ft.';
  }
  return '5" (125 mm) typical for rooms up to 12 ft span. Use 150 mm for larger halls.';
}

function footingSize(storeys: number): string {
  if (storeys <= 1) return 'About 4\' x 4\' x 12" (1.2 x 1.2 m x 300 mm) on medium soil';
  if (storeys === 2) return 'About 4.5\' x 4.5\' x 12"-15" on medium soil';
  if (storeys === 3) return 'About 5\' x 5\' x 15" on medium soil';
  return 'About 6\' x 6\' x 18" or combined footing - confirm with soil SBC';
}

function foundationDepthLabel(storeys: number, projectDepthFt: number | null): string {
  if (projectDepthFt && projectDepthFt > 0) {
    return `${projectDepthFt} ft as entered on this project. Still check hard strata / water table on site (minimum usually 4 ft below GL).`;
  }
  if (storeys <= 2) return 'Minimum 4 ft (1.2 m) below existing ground, or to hard strata';
  if (storeys === 3) return 'Minimum 5 ft (1.5 m) below existing ground, or to hard strata';
  return 'Minimum 5-6 ft (1.5-1.8 m) below GL. Soil test recommended.';
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
  ];

  const foundationRows: ThumbRuleRow[] = [
    { label: 'Foundation type', value: 'Isolated column footings + plinth beam (typical house)' },
    { label: 'Founding depth', value: foundationDepthLabel(designStoreys, projectDepth) },
    { label: 'Footing size (thumb)', value: footingSize(designStoreys) },
    { label: 'PCC below footing', value: '3"-4" (75-100 mm) PCC 1:4:8' },
    { label: 'Footing concrete', value: 'M20 (1:1.5:3) minimum' },
    { label: 'Plinth beam', value: '9" x 12" (230 x 300 mm), 4 - 12 mm bars + 8 mm stirrups @ 150-200 mm' },
    {
      label: 'Plinth height',
      value: 'Minimum 1.5-2 ft (450-600 mm) above existing ground / road level',
    },
  ];

  const columnRows: ThumbRuleRow[] = frame
    ? [
        { label: 'Column size (thumb)', value: columnSize(designStoreys, typicalFloor) },
        { label: 'Main bars', value: columnBars(designStoreys) },
        {
          label: 'Ties / stirrups',
          value: '8 mm ties @ 150 mm c/c near ends (and at beam junctions); 8 mm @ 200 mm at mid-height',
        },
        {
          label: 'Why this size',
          value: `Columns and footings are sized for ${designStoreys} storey${designStoreys === 1 ? '' : 's'} (future provision if entered), not only the floor being built now.`,
        },
      ]
    : [
        {
          label: 'RCC frame',
          value: 'No full RCC frame selected on this project. Use these sizes if a frame is added later.',
        },
      ];

  const beamRows: ThumbRuleRow[] = frame
    ? [
        { label: 'Typical beam size', value: beamSize(designStoreys, typicalFloor) },
        { label: 'Main steel', value: beamMainBars(designStoreys) },
        {
          label: 'Stirrups',
          value:
            '8 mm 2-legged @ 150 mm c/c for L/4 from each support; 8 mm @ 200-250 mm at mid-span. Always closer at beam-column joints.',
        },
        {
          label: 'Lintel / sunshade',
          value: 'Lintel 6" x 9" (150 x 230 mm) with 2-10 mm + 8 mm stirrups @ 150 mm. Sunshade slab 3" (75 mm).',
        },
      ]
    : [
        {
          label: 'Beams',
          value: 'RCC beam schedule applies when a frame / slab is in scope. Lintel 6" x 9" still recommended over openings.',
        },
      ];

  const slabRows: ThumbRuleRow[] =
    frame && !assamOnly
      ? [
          { label: 'Slab thickness', value: slabThickness(typicalFloor) },
          {
            label: 'Slab steel',
            value:
              'Main bars 8 mm @ 150 mm c/c (or 10 mm @ 200 mm for longer spans). Distribution 8 mm @ 200-250 mm c/c.',
          },
          {
            label: 'Extra steel',
            value: 'Extra top bars 8 mm at supports for L/4. Provide extra around openings / sunken toilets.',
          },
          { label: 'Staircase waist', value: '6" (150 mm) waist slab; riser 6"-7", tread 10"-12"' },
        ]
      : [
          {
            label: 'RCC slab',
            value: assamOnly
              ? 'Assam Type roof is not a typical RCC floor slab. See Assam roof notes below.'
              : 'No RCC slab selected. If a slab is added, use 125 mm with 8 mm @ 150 mm as a starting thumb rule.',
          },
        ];

  const steelRows: ThumbRuleRow[] = [
    { label: 'Steel grade', value: 'HYSD / TMT Fe 500 (or Fe 500D). Do not mix rusted / undersized bars.' },
    { label: 'Lap length', value: 'Tension lap about 50 x bar dia. Stagger laps. No lap at mid-span bottom of beams.' },
    { label: 'Development / hook', value: 'Standard 90-degree hook at beam ends. Column starter bars min. 45-50 x dia into footing.' },
    {
      label: 'Chairs / cover blocks',
      value: 'Use proper cover blocks. Slab chairs so top mesh cannot sink during concreting.',
    },
  ];

  const coverRows: ThumbRuleRow[] = [
    { label: 'Slab clear cover', value: '20 mm' },
    { label: 'Beam clear cover', value: '25 mm' },
    { label: 'Column clear cover', value: '40 mm' },
    { label: 'Footing clear cover', value: '50 mm' },
    { label: 'RCC concrete grade', value: 'M20 (1:1.5:3) minimum for slab, beam, column, footing' },
    { label: 'Curing', value: 'Keep wet for 7-14 days (10 days typical in Assam humidity / heat)' },
  ];

  const masonryRows: ThumbRuleRow[] = [];
  if (hasBrickScope(mistri) || hasPlasterScope(mistri) || hasBoundaryScope(mistri) || hasFlooringScope(mistri)) {
    const brick = mistri?.floorWork?.find((floor) => floor.brickMaterial)?.brickMaterial
      ?? mistri?.brickworkDetails?.materialType;
    masonryRows.push({
      label: 'Wall thickness',
      value:
        brick === 'aac_block'
          ? 'AAC: external 6"-8" (150-200 mm), internal 4" (100 mm) typical'
          : 'Red brick: external 9" (230 mm), internal 4.5" (115 mm) typical',
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
        value: '25-40 mm bedding mortar for tiles / marble. Keep floor trap / slope 1:60 to 1:80 in wet areas.',
      });
    }
    if (hasBoundaryScope(mistri) && mistri?.boundaryWallDetails) {
      const thickness =
        mistri.boundaryWallDetails.thickness === '3_inch' ? '3" (75 mm)' : '5" (125 mm)';
      masonryRows.push({
        label: 'Boundary wall',
        value: `${thickness} ${mistri.boundaryWallDetails.structureType === 'half_grill' ? 'half-grill' : 'full solid'}. Intermediate 9" x 9" columns every 8-10 ft, foundation 2.5-3 ft.`,
      });
    }
  }

  const assamRows: ThumbRuleRow[] = [];
  if (assam) {
    assamRows.push({
      label: 'Assam Type note',
      value:
        'Light roof house: size foundation and plinth for the future floors entered. Superstructure follows timber / steel / RCC truss - not a full multi-storey RCC slab building.',
    });
    if (roof) {
      assamRows.push({ label: 'Roof on this project', value: roof });
    }
    assamRows.push({
      label: 'Truss / purlin (thumb)',
      value:
        'Steel truss: rafters about 75 x 40 mm or as designed, purlins 2-3 ft c/c. Wood truss: treat timber against moisture / termite. RCC truss: follow the same cover and M20 rules.',
    });
    assamRows.push({
      label: 'Posts / walls',
      value: 'Hold posts plumb. Provide bracings. Tie walls to plinth beam. Do not rest heavy RCC slab on Assam walls without an engineer.',
    });
  }

  const checklistRows: ThumbRuleRow[] = [
    { label: 'Before casting', value: 'Check cover, bar count, stirrup spacing, and lap positions with the Mistri / owner together.' },
    { label: 'Column alignment', value: 'Columns must be in one line plumb from footing to terrace. Offset later floors only with an engineer.' },
    { label: 'Water / electrical sleeves', value: 'Fix sleeves in slab / beam before concrete. Do not chase a structural beam later.' },
    { label: 'This sheet', value: 'Site guidance only. Not a signed structural design, bar-bending schedule, or municipal drawing.' },
  ];

  return {
    projectId: project.id,
    numericProjectId: project.numeric_id?.trim() && /^[0-9]{6}$/.test(project.numeric_id.trim())
      ? project.numeric_id.trim()
      : '',
    projectTitle: project.title?.trim() || 'Mistri project',
    siteAddress: siteAddress(project),
    generatedAtLabel,
    snapshotRows,
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
      'These are common Indian residential site thumb rules (IS 456 / usual Assam house practice) scaled to this project\'s area and storeys. They are NOT a structural design. Soil SBC, exact room spans, seismic detailing, and final bar schedules must be checked by a licensed structural engineer before casting.',
  };
}
