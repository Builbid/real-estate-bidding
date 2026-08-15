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
export const CONSTRUCTION_TYPE_BRICK = 'Brick / AAC Wall' as const;
export const CONSTRUCTION_TYPE_PLASTER = 'Plastering Work' as const;
export const CONSTRUCTION_TYPE_FLOORING = 'Flooring Work' as const;

export type ConstructionTypeValue =
  | typeof CONSTRUCTION_TYPE_GROUND
  | typeof CONSTRUCTION_TYPE_UPPER
  | typeof CONSTRUCTION_TYPE_FULL
  | typeof CONSTRUCTION_TYPE_BRICK
  | typeof CONSTRUCTION_TYPE_PLASTER
  | typeof CONSTRUCTION_TYPE_FLOORING;

export type ConstructionTypesMap = Partial<Record<BuildingType, ConstructionTypeValue>>;

export interface LabourConstructionOption {
  value: ConstructionTypeValue;
  title: string;
  description: string;
  kind: 'structural' | 'finishing';
}

export function isAssamBuildingType(type: BuildingType): boolean {
  return type === ASSAM_BUILDING_TYPE;
}

export function includesFoundation(type: BuildingType): boolean {
  return type === ASSAM_BUILDING_TYPE || type === 'RCC Ground Floor';
}

export function isSkeletonConstructionType(value: ConstructionTypeValue): boolean {
  return value === CONSTRUCTION_TYPE_GROUND || value === CONSTRUCTION_TYPE_UPPER;
}

export function isStructuralConstructionType(value: ConstructionTypeValue): boolean {
  return isSkeletonConstructionType(value) || value === CONSTRUCTION_TYPE_FULL;
}

export function isFinishingOnlyConstructionType(value: ConstructionTypeValue): boolean {
  return (
    value === CONSTRUCTION_TYPE_BRICK ||
    value === CONSTRUCTION_TYPE_PLASTER ||
    value === CONSTRUCTION_TYPE_FLOORING
  );
}

export function getSkeletonOptionValue(type: BuildingType): ConstructionTypeValue {
  return includesFoundation(type) ? CONSTRUCTION_TYPE_GROUND : CONSTRUCTION_TYPE_UPPER;
}

export function getSkeletonSubLabel(type: BuildingType): string {
  return includesFoundation(type) ? 'Foundation + Column + Slab' : 'Column + Slab only';
}

/** All labour Construction Scope radios for a floor (availability not applied). */
export function getLabourConstructionOptions(buildingType: BuildingType): LabourConstructionOption[] {
  const skeleton = getSkeletonOptionValue(buildingType);
  return [
    {
      value: CONSTRUCTION_TYPE_FULL,
      title: 'Full Finished Structure',
      description:
        'Includes column, beam, slab, brick work, plastering and rough flooring work.',
      kind: 'structural',
    },
    {
      value: skeleton,
      title: 'Frame (Skeleton) only',
      description: includesFoundation(buildingType)
        ? 'Foundation, columns, beams and slab casting only — no walls or finishing.'
        : 'Columns, beams and slab casting only — no walls or finishing.',
      kind: 'structural',
    },
    {
      value: CONSTRUCTION_TYPE_BRICK,
      title: 'Brick / AAC wall',
      description: 'Wall construction only. Floor skeleton must already be complete.',
      kind: 'finishing',
    },
    {
      value: CONSTRUCTION_TYPE_PLASTER,
      title: 'Plastering work',
      description: 'Internal and external plastering. Walls should already be built.',
      kind: 'finishing',
    },
    {
      value: CONSTRUCTION_TYPE_FLOORING,
      title: 'Flooring work (Tile / Marble / Granite)',
      description: 'Floor finishing only. Structure and walls should already be ready.',
      kind: 'finishing',
    },
  ];
}

/**
 * Finishing-only work on floor F is blocked when any lower selected floor has
 * structural scope (Full Finished or Skeleton) — that lower storey is being built now,
 * so F's frame does not exist yet.
 */
export function getFinishingBlockReason(
  buildingType: BuildingType,
  buildingTypes: BuildingType[],
  constructionTypes: ConstructionTypesMap,
): string | null {
  const ordered = sortBuildingTypes(buildingTypes);
  const index = ordered.indexOf(buildingType);
  if (index <= 0) return null;

  for (let i = 0; i < index; i++) {
    const lower = ordered[i];
    const lowerScope = constructionTypes[lower];
    if (lowerScope && isStructuralConstructionType(lowerScope)) {
      return (
        `${getFloorDisplayName(buildingType)} frame isn't built yet while ` +
        `${getFloorDisplayName(lower)} is under structural work.`
      );
    }
  }
  return null;
}

export function getAvailableLabourConstructionOptions(
  buildingType: BuildingType,
  buildingTypes: BuildingType[],
  constructionTypes: ConstructionTypesMap,
): Array<LabourConstructionOption & { disabled: boolean; disabledReason: string | null }> {
  const blockReason = getFinishingBlockReason(buildingType, buildingTypes, constructionTypes);
  return getLabourConstructionOptions(buildingType).map((opt) => {
    const disabled = opt.kind === 'finishing' && !!blockReason;
    return {
      ...opt,
      disabled,
      disabledReason: disabled ? blockReason : null,
    };
  });
}

/** Clear finishing-only picks that violate lower-floor structural dependency. */
export function pruneInvalidConstructionTypes(
  buildingTypes: BuildingType[],
  constructionTypes: ConstructionTypesMap,
): { next: ConstructionTypesMap; cleared: BuildingType[] } {
  const ordered = sortBuildingTypes(buildingTypes);
  const next: ConstructionTypesMap = {};
  const cleared: BuildingType[] = [];

  for (const type of ordered) {
    const scope = constructionTypes[type];
    if (!scope) continue;
    if (
      isFinishingOnlyConstructionType(scope) &&
      getFinishingBlockReason(type, buildingTypes, constructionTypes)
    ) {
      cleared.push(type);
      continue;
    }
    next[type] = scope;
  }

  return { next, cleared };
}

export function validateLabourConstructionDependencies(
  buildingTypes: BuildingType[],
  constructionTypes: ConstructionTypesMap,
): string | null {
  const ordered = sortBuildingTypes(buildingTypes);
  for (const type of ordered) {
    const scope = constructionTypes[type];
    if (!scope) continue;
    if (!isFinishingOnlyConstructionType(scope)) continue;
    const reason = getFinishingBlockReason(type, buildingTypes, constructionTypes);
    if (reason) return reason;
  }
  return null;
}

export function getConstructionOptionsForBuildingType(
  type: BuildingType,
): { value: ConstructionTypeValue; emoji: string }[] {
  return getLabourConstructionOptions(type).map((opt) => ({
    value: opt.value,
    emoji: getConstructionDisplayEmoji(opt.value),
  }));
}

export function getIncludedSteps(
  buildingType: BuildingType,
  constructionType: ConstructionTypeValue,
): { label: string; included: boolean }[] {
  if (isFinishingOnlyConstructionType(constructionType)) {
    return getFinishingOnlyIncludedSteps(constructionType);
  }

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

function getFinishingOnlyIncludedSteps(
  constructionType: ConstructionTypeValue,
): { label: string; included: boolean }[] {
  if (constructionType === CONSTRUCTION_TYPE_BRICK) {
    return [
      { label: 'Brick / AAC wall construction', included: true },
      { label: 'Frame / skeleton (already complete — not in this bid)', included: false },
      { label: 'Plastering (not included)', included: false },
      { label: 'Flooring (not included)', included: false },
    ];
  }
  if (constructionType === CONSTRUCTION_TYPE_PLASTER) {
    return [
      { label: 'Internal & external plastering', included: true },
      { label: 'Brick walls (already built — not in this bid)', included: false },
      { label: 'Flooring (not included)', included: false },
    ];
  }
  return [
    { label: 'Tile / marble / granite flooring', included: true },
    { label: 'Structure & walls (already ready — not in this bid)', included: false },
    { label: 'Plastering (not included)', included: false },
  ];
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
  // Skeleton → structural; Full + finishing-only packages → full (bid matrix)
  return isSkeletonConstructionType(value) ? 'structural' : 'full';
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
    const assam_config: AssamConfig = isSkeletonConstructionType(ct)
      ? 'frame_to_roof'
      : 'full_finishing';
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

export function getConstructionDisplayShortLabel(value: ConstructionTypeValue): string {
  switch (value) {
    case CONSTRUCTION_TYPE_FULL:
      return 'Full Finished Structure';
    case CONSTRUCTION_TYPE_BRICK:
      return 'Brick / AAC Wall';
    case CONSTRUCTION_TYPE_PLASTER:
      return 'Plastering Work';
    case CONSTRUCTION_TYPE_FLOORING:
      return 'Flooring Work';
    default:
      return isSkeletonConstructionType(value) ? 'Frame (Skeleton) only' : value;
  }
}

export function getConstructionDisplayEmoji(value: ConstructionTypeValue): string {
  if (isSkeletonConstructionType(value)) return '🏗';
  if (value === CONSTRUCTION_TYPE_FULL) return '🏡';
  if (value === CONSTRUCTION_TYPE_BRICK) return '🧱';
  if (value === CONSTRUCTION_TYPE_PLASTER) return '🎨';
  if (value === CONSTRUCTION_TYPE_FLOORING) return '🪨';
  return '🏗️';
}

export function getConstructionTooltipSteps(
  buildingType: BuildingType,
  kind: 'skeleton' | 'full' | ConstructionTypeValue,
  serviceType: 'labour_contractor' | 'construction_firm' = 'labour_contractor',
): { label: string; included: boolean }[] {
  if (
    kind === CONSTRUCTION_TYPE_BRICK ||
    kind === CONSTRUCTION_TYPE_PLASTER ||
    kind === CONSTRUCTION_TYPE_FLOORING
  ) {
    return getFinishingOnlyIncludedSteps(kind);
  }

  const withFoundation = includesFoundation(buildingType);
  const isFull = kind === 'full' || kind === CONSTRUCTION_TYPE_FULL;

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
  // Soft tinted headers — readable text on light and dark themes
  switch (type) {
    case 'Assam Type':
      return {
        icon: '🏛️',
        className:
          'bg-amber-50 dark:bg-amber-950/45 border-l-amber-400 dark:border-l-amber-500 text-amber-950 dark:text-amber-50 ring-1 ring-amber-200/60 dark:ring-amber-800/40',
      };
    case 'RCC Ground Floor':
      return {
        icon: '🏠',
        className:
          'bg-stone-100 dark:bg-stone-800/55 border-l-stone-400 dark:border-l-stone-400 text-stone-900 dark:text-stone-50 ring-1 ring-stone-200/70 dark:ring-stone-700/50',
      };
    case 'RCC 1st Floor':
      return {
        icon: '🏢',
        className:
          'bg-sky-50 dark:bg-sky-950/45 border-l-sky-400 dark:border-l-sky-400 text-sky-950 dark:text-sky-50 ring-1 ring-sky-200/70 dark:ring-sky-800/40',
      };
    case 'RCC 2nd Floor':
      return {
        icon: '🏗️',
        className:
          'bg-teal-50 dark:bg-teal-950/45 border-l-teal-400 dark:border-l-teal-400 text-teal-950 dark:text-teal-50 ring-1 ring-teal-200/70 dark:ring-teal-800/40',
      };
    case 'RCC 3rd Floor':
      return {
        icon: '🏗️',
        className:
          'bg-indigo-50 dark:bg-indigo-950/45 border-l-indigo-400 dark:border-l-indigo-400 text-indigo-950 dark:text-indigo-50 ring-1 ring-indigo-200/70 dark:ring-indigo-800/40',
      };
    case 'RCC 4th Floor':
      return {
        icon: '🏗️',
        className:
          'bg-rose-50 dark:bg-rose-950/45 border-l-rose-400 dark:border-l-rose-400 text-rose-950 dark:text-rose-50 ring-1 ring-rose-200/70 dark:ring-rose-800/40',
      };
    default:
      return {
        icon: '🏗️',
        className:
          'bg-secondary border-l-border text-foreground ring-1 ring-border/60',
      };
  }
}
