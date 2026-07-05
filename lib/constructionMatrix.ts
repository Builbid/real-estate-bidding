import type { AssamConfig, RCCConfig, SubConfiguration, TrackType } from './types';

export type ConstructionStage = 'structural' | 'full';
export type FloorKey = 'ground' | 'first' | 'second';

export interface FloorStage {
  floor: FloorKey;
  stage: ConstructionStage;
}

export interface MatrixOption {
  id: RCCConfig;
  tier: 'ground' | 'g_plus_1' | 'g_plus_2';
  optionNumber: number;
  floors: FloorStage[];
}

export const STAGE_EMOJI = {
  structural: '🏗️',
  full: '🏠',
} as const;

export const STAGE_SHORT_LABEL: Record<ConstructionStage, string> = {
  structural: 'Column & Roof Only',
  full: 'Full Structure Done',
};

export const FLOOR_DISPLAY: Record<FloorKey, string> = {
  ground: 'Ground Floor',
  first: 'First Floor',
  second: 'Second Floor',
};

export const ASSAM_CONFIG_LABELS: Record<AssamConfig, string> = {
  frame_to_roof: `${STAGE_EMOJI.structural} ${STAGE_SHORT_LABEL.structural}`,
  full_finishing: `${STAGE_EMOJI.full} ${STAGE_SHORT_LABEL.full}`,
};

export const RCC_MATRIX_OPTIONS: MatrixOption[] = [
  // Ground — 2 options
  { id: 'ground_only', tier: 'ground', optionNumber: 1, floors: [{ floor: 'ground', stage: 'structural' }] },
  { id: 'ground_full', tier: 'ground', optionNumber: 2, floors: [{ floor: 'ground', stage: 'full' }] },
  // G+1 — 4 options
  { id: 'g_plus_1_structural', tier: 'g_plus_1', optionNumber: 1, floors: [{ floor: 'ground', stage: 'structural' }, { floor: 'first', stage: 'structural' }] },
  { id: 'g_plus_1_structural_full', tier: 'g_plus_1', optionNumber: 2, floors: [{ floor: 'ground', stage: 'structural' }, { floor: 'first', stage: 'full' }] },
  { id: 'g_plus_1_full_structural', tier: 'g_plus_1', optionNumber: 3, floors: [{ floor: 'ground', stage: 'full' }, { floor: 'first', stage: 'structural' }] },
  { id: 'g_plus_1_full', tier: 'g_plus_1', optionNumber: 4, floors: [{ floor: 'ground', stage: 'full' }, { floor: 'first', stage: 'full' }] },
  // G+2 — 8 options
  { id: 'g_plus_2_structural_structural', tier: 'g_plus_2', optionNumber: 1, floors: [{ floor: 'ground', stage: 'structural' }, { floor: 'first', stage: 'structural' }, { floor: 'second', stage: 'structural' }] },
  { id: 'g_plus_2_structural_structural_full', tier: 'g_plus_2', optionNumber: 2, floors: [{ floor: 'ground', stage: 'structural' }, { floor: 'first', stage: 'structural' }, { floor: 'second', stage: 'full' }] },
  { id: 'g_plus_2_structural_full', tier: 'g_plus_2', optionNumber: 3, floors: [{ floor: 'ground', stage: 'structural' }, { floor: 'first', stage: 'full' }, { floor: 'second', stage: 'structural' }] },
  { id: 'g_plus_2_structural_full_full', tier: 'g_plus_2', optionNumber: 4, floors: [{ floor: 'ground', stage: 'structural' }, { floor: 'first', stage: 'full' }, { floor: 'second', stage: 'full' }] },
  { id: 'g_plus_2_full_structural', tier: 'g_plus_2', optionNumber: 5, floors: [{ floor: 'ground', stage: 'full' }, { floor: 'first', stage: 'structural' }, { floor: 'second', stage: 'structural' }] },
  { id: 'g_plus_2_full_structural_full', tier: 'g_plus_2', optionNumber: 6, floors: [{ floor: 'ground', stage: 'full' }, { floor: 'first', stage: 'structural' }, { floor: 'second', stage: 'full' }] },
  { id: 'g_plus_2_full_full_structural', tier: 'g_plus_2', optionNumber: 7, floors: [{ floor: 'ground', stage: 'full' }, { floor: 'first', stage: 'full' }, { floor: 'second', stage: 'structural' }] },
  { id: 'g_plus_2_full_full', tier: 'g_plus_2', optionNumber: 8, floors: [{ floor: 'ground', stage: 'full' }, { floor: 'first', stage: 'full' }, { floor: 'second', stage: 'full' }] },
];

export const RCC_CONFIG_LABELS: Record<RCCConfig, string> = Object.fromEntries(
  RCC_MATRIX_OPTIONS.map((o) => [o.id, formatMatrixSummary(o.floors)]),
) as Record<RCCConfig, string>;

const RCC_OPTION_BY_ID = Object.fromEntries(
  RCC_MATRIX_OPTIONS.map((o) => [o.id, o]),
) as Record<RCCConfig, MatrixOption>;

const TIER_GROUPS = [
  { tier: 'ground' as const, label: 'Ground Floor — 2 Options' },
  { tier: 'g_plus_1' as const, label: 'G+1 Building — 4 Options' },
  { tier: 'g_plus_2' as const, label: 'G+2 Building — 8 Options' },
];

export function getMatrixTierGroups() {
  return TIER_GROUPS.map((g) => ({
    ...g,
    options: RCC_MATRIX_OPTIONS.filter((o) => o.tier === g.tier),
  }));
}

/** Legacy decode when `floors` array is absent from stored JSON. */
const LEGACY_RCC_FLOORS: Partial<Record<RCCConfig, FloorStage[]>> = {
  ground_only: [{ floor: 'ground', stage: 'structural' }],
  g_plus_1_structural: [{ floor: 'ground', stage: 'structural' }, { floor: 'first', stage: 'structural' }],
  g_plus_1_full: [{ floor: 'ground', stage: 'full' }, { floor: 'first', stage: 'full' }],
  g_plus_2_structural_structural: [
    { floor: 'ground', stage: 'structural' },
    { floor: 'first', stage: 'structural' },
    { floor: 'second', stage: 'structural' },
  ],
  g_plus_2_structural_full: [
    { floor: 'ground', stage: 'structural' },
    { floor: 'first', stage: 'full' },
    { floor: 'second', stage: 'structural' },
  ],
  g_plus_2_full_structural: [
    { floor: 'ground', stage: 'full' },
    { floor: 'first', stage: 'structural' },
    { floor: 'second', stage: 'structural' },
  ],
  g_plus_2_full_full: [
    { floor: 'ground', stage: 'full' },
    { floor: 'first', stage: 'full' },
    { floor: 'second', stage: 'full' },
  ],
};

export function getStageLabel(stage: ConstructionStage): string {
  return `${STAGE_EMOJI[stage]} ${STAGE_SHORT_LABEL[stage]}`;
}

export function getIncludedSteps(
  floor: FloorKey,
  stage: ConstructionStage,
): { label: string; included: boolean }[] {
  const steps: { label: string; included: boolean }[] = [];

  if (floor === 'ground') {
    steps.push({ label: 'Foundation', included: true });
  }

  steps.push(
    { label: 'Columns', included: true },
    { label: 'Beams', included: true },
    { label: 'Roof Slab', included: true },
    {
      label: stage === 'full' ? 'Brick Walls' : 'Brick Walls (not included)',
      included: stage === 'full',
    },
    {
      label: stage === 'full' ? 'Plastering' : 'Plastering (not included)',
      included: stage === 'full',
    },
  );

  return steps;
}

export function getWhatsIncludedFlow(floor: FloorKey, stage: ConstructionStage): string {
  return getIncludedSteps(floor, stage)
    .map((s) => `${s.included ? '✅' : '❌'} ${s.label}`)
    .join('\n');
}

export function formatFloorStageLine(floor: FloorKey, stage: ConstructionStage): string {
  return `${FLOOR_DISPLAY[floor]} → ${getStageLabel(stage)}`;
}

export function formatMatrixSummary(floors: FloorStage[]): string {
  return floors.map((f) => `${FLOOR_DISPLAY[f.floor].replace(' Floor', '')}: ${STAGE_SHORT_LABEL[f.stage]}`).join(' · ');
}

export function formatMatrixSummaryMultiline(floors: FloorStage[]): string[] {
  return floors.map((f) => formatFloorStageLine(f.floor, f.stage));
}

export function getProjectFloorStages(
  trackType: TrackType,
  subConfig: SubConfiguration,
): FloorStage[] {
  if (trackType === 'AssamType') {
    const stage: ConstructionStage =
      subConfig.assam_config === 'full_finishing' ? 'full' : 'structural';
    return [{ floor: 'ground', stage }];
  }

  if (subConfig.floors?.length) {
    return subConfig.floors.map((f) => ({
      floor: f.floor,
      stage: f.type,
    }));
  }

  const cfg = subConfig.rcc_config;
  if (!cfg) return [];

  if (RCC_OPTION_BY_ID[cfg]) {
    return RCC_OPTION_BY_ID[cfg].floors;
  }

  return LEGACY_RCC_FLOORS[cfg] ?? [];
}

export function getMatrixOptionLabel(
  trackType: TrackType,
  subConfig: SubConfiguration,
): string {
  if (trackType === 'AssamType' && subConfig.assam_config) {
    return ASSAM_CONFIG_LABELS[subConfig.assam_config];
  }

  const floors = getProjectFloorStages(trackType, subConfig);
  if (floors.length === 0) return '—';

  if (floors.length === 1) {
    return getStageLabel(floors[0].stage);
  }

  return formatMatrixSummary(floors);
}

export function buildRccSubConfiguration(config: RCCConfig): SubConfiguration {
  const option = RCC_OPTION_BY_ID[config];
  return {
    rcc_config: config,
    floors: option.floors.map((f) => ({ floor: f.floor, type: f.stage })),
  };
}

export function getFloorCountFromStages(floors: FloorStage[]): number {
  return floors.length;
}

export function getFloorCountForRCC(config: RCCConfig): number {
  return RCC_OPTION_BY_ID[config]?.floors.length ?? LEGACY_RCC_FLOORS[config]?.length ?? 1;
}
