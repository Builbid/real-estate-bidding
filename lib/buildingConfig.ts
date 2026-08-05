import type { AssamConfig, RCCConfig, SubConfiguration, TrackType } from './types';

/** Step 1 — selectable building type labels (stored verbatim in DB). */
export const BUILDING_TYPE_OPTIONS = [
  'Assam Type',
  'RCC Ground Floor',
  'RCC 1st Floor',
  'RCC 2nd Floor',
  'RCC 3rd Floor',
  'RCC 4th Floor',
] as const;

export type BuildingType = (typeof BUILDING_TYPE_OPTIONS)[number];

export const ASSAM_BUILDING_TYPE: BuildingType = 'Assam Type';

export const RCC_BUILDING_TYPES: BuildingType[] = BUILDING_TYPE_OPTIONS.filter(
  (t) => t !== ASSAM_BUILDING_TYPE,
);

/** Display order for Step 2 groups and summaries. */
export const BUILDING_TYPE_ORDER: BuildingType[] = [...BUILDING_TYPE_OPTIONS];

export const CONSTRUCTION_TYPE_GROUND = 'Foundation + Column + Slab Casting' as const;
export const CONSTRUCTION_TYPE_UPPER = 'Column + Slab Casting' as const;
export const CONSTRUCTION_TYPE_FULL = 'Full Finishing' as const;

export type ConstructionTypeValue =
  | typeof CONSTRUCTION_TYPE_GROUND
  | typeof CONSTRUCTION_TYPE_UPPER
  | typeof CONSTRUCTION_TYPE_FULL;

export type ConstructionTypesMap = Partial<Record<BuildingType, ConstructionTypeValue>>;

export function isAssamBuildingType(type: BuildingType): boolean {
  return type === ASSAM_BUILDING_TYPE;
}

export function includesFoundation(type: BuildingType): boolean {
  return type === ASSAM_BUILDING_TYPE || type === 'RCC Ground Floor';
}

export function getConstructionOptionsForBuildingType(
  type: BuildingType,
): { value: ConstructionTypeValue; emoji: string }[] {
  if (includesFoundation(type)) {
    return [
      { value: CONSTRUCTION_TYPE_GROUND, emoji: '🏗️' },
      { value: CONSTRUCTION_TYPE_FULL, emoji: '🏠' },
    ];
  }
  return [
    { value: CONSTRUCTION_TYPE_UPPER, emoji: '🏗️' },
    { value: CONSTRUCTION_TYPE_FULL, emoji: '🏠' },
  ];
}

export function getIncludedSteps(
  buildingType: BuildingType,
  constructionType: ConstructionTypeValue,
): { label: string; included: boolean }[] {
  const isFull = constructionType === CONSTRUCTION_TYPE_FULL;
  const steps: { label: string; included: boolean }[] = [];

  if (includesFoundation(buildingType)) {
    steps.push({ label: 'Foundation / Soil excavation & preparation', included: true });
  }

  steps.push(
    { label: 'Column reinforcement & casting', included: true },
    { label: 'Beam work', included: true },
    { label: 'Slab casting & curing', included: true },
    {
      label: isFull ? 'Brick wall work' : 'Brick walls (not included)',
      included: isFull,
    },
    {
      label: isFull ? 'Internal & external plastering' : 'Plastering (not included)',
      included: isFull,
    },
    {
      label: isFull ? 'Basic flooring' : 'Finishing work (not included)',
      included: isFull,
    },
  );

  return steps;
}

export function sortBuildingTypes(types: BuildingType[]): BuildingType[] {
  const set = new Set(types);
  return BUILDING_TYPE_ORDER.filter((t) => set.has(t));
}

export function formatBuildingTypesSummary(types: BuildingType[]): string {
  return sortBuildingTypes(types).join(' · ');
}

const LEGACY_FLOOR_KEYS = ['ground', 'first', 'second'] as const;

function toLegacyStage(value: ConstructionTypeValue): 'structural' | 'full' {
  return value === CONSTRUCTION_TYPE_FULL ? 'full' : 'structural';
}

/** Map up to 3 RCC floors → legacy bid floor keys (bidding unchanged). */
function buildLegacyFloors(
  buildingTypes: BuildingType[],
  constructionTypes: ConstructionTypesMap,
): Array<{ floor: 'ground' | 'first' | 'second'; type: 'structural' | 'full' }> {
  const rccSorted = sortBuildingTypes(buildingTypes.filter((t) => !isAssamBuildingType(t)));
  return rccSorted.slice(0, 3).map((type, index) => ({
    floor: LEGACY_FLOOR_KEYS[index] ?? 'ground',
    type: toLegacyStage(constructionTypes[type] ?? CONSTRUCTION_TYPE_GROUND),
  }));
}

function pickRccConfig(floors: NonNullable<SubConfiguration['floors']>): RCCConfig {
  const stages = floors.map((f) => f.type);
  const n = floors.length;

  if (n === 1) {
    return stages[0] === 'full' ? 'ground_full' : 'ground_only';
  }
  if (n === 2) {
    const [g, f] = stages;
    if (g === 'structural' && f === 'structural') return 'g_plus_1_structural';
    if (g === 'structural' && f === 'full') return 'g_plus_1_structural_full';
    if (g === 'full' && f === 'structural') return 'g_plus_1_full_structural';
    return 'g_plus_1_full';
  }
  const [g, f, s] = stages;
  const key = `${g}_${f}_${s}` as const;
  const map: Record<string, RCCConfig> = {
    structural_structural_structural: 'g_plus_2_structural_structural',
    structural_structural_full: 'g_plus_2_structural_structural_full',
    structural_full_structural: 'g_plus_2_structural_full',
    structural_full_full: 'g_plus_2_structural_full_full',
    full_structural_structural: 'g_plus_2_full_structural',
    full_structural_full: 'g_plus_2_full_structural_full',
    full_full_structural: 'g_plus_2_full_full_structural',
    full_full_full: 'g_plus_2_full_full',
  };
  return map[key] ?? 'g_plus_2_structural_structural';
}

/**
 * Derives legacy track_type / sub_configuration / total_floors for unchanged bidding logic.
 * DB total_floors remains 1–3; building_types may list up to 4 RCC floors for display.
 */
export function deriveLegacyProjectFields(
  buildingTypes: BuildingType[],
  constructionTypes: ConstructionTypesMap,
): {
  track_type: TrackType;
  sub_configuration: SubConfiguration;
  total_floors: 1 | 2 | 3;
} {
  if (buildingTypes.includes(ASSAM_BUILDING_TYPE)) {
    const ct = constructionTypes[ASSAM_BUILDING_TYPE] ?? CONSTRUCTION_TYPE_GROUND;
    const assam_config: AssamConfig =
      ct === CONSTRUCTION_TYPE_FULL ? 'full_finishing' : 'frame_to_roof';
    return {
      track_type: 'AssamType',
      sub_configuration: {
        assam_config,
        floors: [{ floor: 'ground', type: toLegacyStage(ct) }],
      },
      total_floors: 1,
    };
  }

  const floors = buildLegacyFloors(buildingTypes, constructionTypes);
  const bidFloorCount = Math.min(Math.max(floors.length, 1), 3) as 1 | 2 | 3;
  const floorsForBid = floors.slice(0, bidFloorCount);

  return {
    track_type: 'RCC',
    sub_configuration: {
      rcc_config: pickRccConfig(floorsForBid),
      floors: floorsForBid,
    },
    total_floors: bidFloorCount,
  };
}

export function hasNewBuildingConfig(project: {
  building_types?: BuildingType[] | null;
}): boolean {
  return Array.isArray(project.building_types) && project.building_types.length > 0;
}

export function getFloorDisplayName(type: BuildingType): string {
  if (type === ASSAM_BUILDING_TYPE) return 'Assam Type';
  return type.replace('RCC ', '');
}

export function getFloorBadge(type: BuildingType): string {
  switch (type) {
    case ASSAM_BUILDING_TYPE:
      return 'A';
    case 'RCC Ground Floor':
      return 'G';
    case 'RCC 1st Floor':
      return '1';
    case 'RCC 2nd Floor':
      return '2';
    case 'RCC 3rd Floor':
      return '3';
    case 'RCC 4th Floor':
      return '4';
    default:
      return '?';
  }
}

export function getFloorStripGradient(type: BuildingType): string {
  switch (type) {
    case ASSAM_BUILDING_TYPE:
    case 'RCC Ground Floor':
      return 'linear-gradient(90deg, #92400e 0%, #1a2030 100%)';
    case 'RCC 1st Floor':
      return 'linear-gradient(90deg, #1e3a8a 0%, #1a2030 100%)';
    case 'RCC 2nd Floor':
      return 'linear-gradient(90deg, #064e3b 0%, #1a2030 100%)';
    case 'RCC 3rd Floor':
      return 'linear-gradient(90deg, #4c1d95 0%, #1a2030 100%)';
    case 'RCC 4th Floor':
      return 'linear-gradient(90deg, #881337 0%, #1a2030 100%)';
    default:
      return 'linear-gradient(90deg, #334155 0%, #1a2030 100%)';
  }
}

export type FloorSelectedAccent = 'green' | 'purple';

/** V2 mockup accent: green vs purple selected toggle styling. */
export function getFloorSelectedAccent(type: BuildingType): FloorSelectedAccent {
  switch (type) {
    case ASSAM_BUILDING_TYPE:
    case 'RCC 1st Floor':
    case 'RCC 3rd Floor':
      return 'purple';
    default:
      return 'green';
  }
}

export function getFloorHint(type: BuildingType, allSelected: BuildingType[]): string {
  if (includesFoundation(type)) return 'Includes foundation work';

  const rccFloors = sortBuildingTypes(allSelected.filter((t) => !isAssamBuildingType(t)));
  const index = rccFloors.indexOf(type);
  const isTop = index === rccFloors.length - 1;

  if (type === 'RCC 1st Floor') return 'Built on top of ground floor';
  if (isTop) return 'Top floor of your building';
  return 'Built above lower floors';
}

export function isSkeletonConstructionType(value: ConstructionTypeValue): boolean {
  return value === CONSTRUCTION_TYPE_GROUND || value === CONSTRUCTION_TYPE_UPPER;
}

export function getConstructionDisplayShortLabel(value: ConstructionTypeValue): string {
  return isSkeletonConstructionType(value) ? 'Skeleton Only' : 'Full Finishing';
}

export function getConstructionDisplayEmoji(value: ConstructionTypeValue): string {
  return isSkeletonConstructionType(value) ? '🏗' : '🏡';
}

export function getSkeletonSubLabel(type: BuildingType): string {
  return includesFoundation(type) ? 'Foundation + Column + Slab' : 'Column + Slab only';
}

export function getSkeletonOptionValue(type: BuildingType): ConstructionTypeValue {
  return includesFoundation(type) ? CONSTRUCTION_TYPE_GROUND : CONSTRUCTION_TYPE_UPPER;
}

export function getConstructionTooltipSteps(
  buildingType: BuildingType,
  kind: 'skeleton' | 'full',
  serviceType: 'labour_contractor' | 'construction_firm' = 'labour_contractor',
): { label: string; included: boolean }[] {
  const withFoundation = includesFoundation(buildingType);
  const isFull = kind === 'full';

  const steps: { label: string; included: boolean }[] = [];

  if (withFoundation) {
    steps.push({ label: 'Foundation / Soil excavation', included: true });
  }

  steps.push(
    { label: 'Column reinforcement & casting', included: true },
    { label: 'Beam work', included: true },
    { label: 'Slab casting & curing', included: true },
  );

  // Construction firms bid a turnkey ₹/sqft rate covering material + labour +
  // finishing end-to-end, so their "Full Finishing" scope is far more complete
  // than a labour contractor's (who only supplies labour up to basic finishing).
  if (isFull && serviceType === 'construction_firm') {
    steps.push(
      { label: 'Brick wall work', included: true },
      { label: 'Internal & external plastering', included: true },
      { label: 'Complete flooring (tiles/granite)', included: true },
      { label: 'Doors & windows installation', included: true },
      { label: 'Electrical wiring & fittings', included: true },
      { label: 'Plumbing & bathroom (CP) fittings', included: true },
      { label: 'Kitchen platform & fittings', included: true },
      { label: 'Interior & exterior painting', included: true },
    );
  } else {
    steps.push(
      { label: isFull ? 'Brick wall work' : 'Brick walls (not included)', included: isFull },
      { label: isFull ? 'Internal & external plastering' : 'Plastering (not included)', included: isFull },
      { label: isFull ? 'Basic flooring' : 'Finishing work (not included)', included: isFull },
    );
  }

  return steps;
}

export function getSectionHeaderStyle(type: BuildingType): {
  icon: string;
  className: string;
} {
  switch (type) {
    case 'Assam Type':
      return {
        icon: '🏛️',
        className:
          'bg-amber-900 dark:bg-amber-800 border-l-amber-600 dark:border-l-amber-400 text-amber-50 ring-1 ring-black/5 dark:ring-white/10',
      };
    case 'RCC Ground Floor':
      return {
        icon: '🏠',
        className:
          'bg-stone-800 dark:bg-stone-700 border-l-stone-500 dark:border-l-stone-400 text-stone-50 ring-1 ring-black/5 dark:ring-white/10',
      };
    case 'RCC 1st Floor':
      return {
        icon: '🏢',
        className:
          'bg-slate-800 dark:bg-slate-700 border-l-blue-600 dark:border-l-blue-400 text-slate-50 ring-1 ring-black/5 dark:ring-white/10',
      };
    case 'RCC 2nd Floor':
      return {
        icon: '🏗️',
        className:
          'bg-teal-950 dark:bg-teal-900 border-l-teal-600 dark:border-l-teal-400 text-teal-50 ring-1 ring-black/5 dark:ring-white/10',
      };
    case 'RCC 3rd Floor':
      return {
        icon: '🏗️',
        className:
          'bg-indigo-900 dark:bg-indigo-800 border-l-indigo-500 dark:border-l-indigo-400 text-indigo-50 ring-1 ring-black/5 dark:ring-white/10',
      };
    case 'RCC 4th Floor':
      return {
        icon: '🏗️',
        className:
          'bg-violet-900 dark:bg-violet-800 border-l-violet-500 dark:border-l-violet-400 text-violet-50 ring-1 ring-black/5 dark:ring-white/10',
      };
    default:
      return {
        icon: '🏗️',
        className:
          'bg-secondary border-l-border text-foreground ring-1 ring-black/5 dark:ring-white/10',
      };
  }
}
