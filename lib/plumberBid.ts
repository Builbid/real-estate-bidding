import {
  computeBaselineWeightedScore,
  rankingRateFromWeightedScore,
} from '@/lib/bidding-calculator';
import { MIN_CUSTOM_RCC_FLOOR, normalizeCustomFloors } from '@/lib/customFloors';
import { getBidRateFieldError } from '@/lib/validation/bidRates';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  PLUMBING_LABOUR_ONLY_DISCLAIMER,
  PLUMBING_SCOPE_PACKAGES,
  activeBathroomPackageSelections,
  formatBathroomPackageBidLabel,
  formatBathroomPackageItem,
  formatPlumbingFloorPointBreakdown,
  getBathroomPackageLabel,
  getPipingPackageLabel,
  getPlumbingHouseStructureLabel,
  getPlumbingSubOption,
  hasPlumbingPointRateScope,
  hasPlumbingUnitRateScope,
  parseTradeDetails,
  plumbingFloorLabel,
  plumbingFloorPoints,
  plumbingSubOptionQuantities,
  type BathroomPackage,
  type BathroomPackageSelection,
  type CpvcPipeSize,
  type DrainageInstallMethod,
  type PipingPackageKind,
  type PlumberDetails,
  PLUMBING_FLOOR_FIXTURE_FIELDS,
  PLUMBING_FIXTURE_KIND_KEYS,
  type PlumbingFixtureKind,
  type PlumbingFloorFixtureCounts,
  type PlumbingHouseStructure,
  type PlumbingSubOptionId,
  type PlumbingTargetFloor,
  type WaterInstallMethod,
} from '@/lib/tradeWorkDetails';

export const MAX_PLUMBING_BID_OPTIONS = 4;

export const PLUMBING_RATE_UNIT_LABEL = '₹ / unit';

export const PLUMBING_TAPE_MEASURE_DISCLAIMER =
  'Final settlement will be based on actual site measurement at agreed unit rates.';

export { PLUMBING_LABOUR_ONLY_DISCLAIMER };

export type PlumbingRateUnit = 'package' | 'per_running_foot' | 'per_unit';

export interface PlumbingBidOptionInput {
  bathroomPackage?: BathroomPackage | null;
  bathroomPackages?: BathroomPackageSelection[];
  pipingPackage?: PipingPackageKind | null;
  selectedSubOptions?: PlumbingSubOptionId[];
  floorFixtureCounts?: PlumbingFloorFixtureCounts[];
  waterTankConnections?: number | null;
  motorConnections?: number | null;
  cpvcPipeSizes: CpvcPipeSize[];
  waterInstallMethods: WaterInstallMethod[];
  includeToiletWastePipe: boolean;
  drainageInstallMethods: DrainageInstallMethod[];
}

export interface PlumbingBidOption {
  id: string;
  shortLabel: string;
  label: string;
  unit: PlumbingRateUnit;
  unitSuffix: string;
  weight: number;
  note?: string;
  isPiping?: boolean;
  unitType?: 'per_sqft' | 'per_unit';
  /** Per-fixture bidding: number of fixtures the owner listed (rate × quantity = line total). */
  quantity?: number;
  fixtureKind?: PlumbingFixtureKind;
}

export interface PlumbingWeightageContext {
  builtUpArea?: number | string | null;
  structureType?: string | null;
}

function optionLetter(index: number): string {
  return `Option ${String.fromCharCode(65 + index)}`;
}

function withLetters(options: Omit<PlumbingBidOption, 'label'>[]): PlumbingBidOption[] {
  return options.slice(0, MAX_PLUMBING_BID_OPTIONS).map((option, index) => ({
    ...option,
    label: `${optionLetter(index)}: ${option.shortLabel}`,
  }));
}

function tapWaterOption(pipingPackage: PipingPackageKind | null): Omit<PlumbingBidOption, 'label'> {
  const fitting =
    pipingPackage === 'concealing'
      ? 'Concealing / Wall-Cut'
      : pipingPackage === 'non_concealing'
        ? 'Non-Concealing / Open Fitting'
        : '¾ inch CPVC';
  return {
    id: 'pipe:tap:three_quarter',
    shortLabel: `Tap Water Pipe — ¾ inch CPVC (${fitting})`,
    unit: 'per_running_foot',
    unitSuffix: '/Rft',
    weight: 1,
  };
}

function toiletDrainOption(): Omit<PlumbingBidOption, 'label'> {
  return {
    id: 'pipe:toilet:swr',
    shortLabel: 'Toilet Drainage Pipe — 4-inch SWR (Non-Concealing)',
    unit: 'per_running_foot',
    unitSuffix: '/Rft',
    weight: 1,
  };
}

function bathroomRateOption(
  item: BathroomPackageSelection,
): Omit<PlumbingBidOption, 'label'> {
  return {
    id: `package:${item.package}`,
    shortLabel: formatBathroomPackageBidLabel(item),
    unit: 'package',
    unitSuffix: '/unit',
    weight: 1,
  };
}

export function resolvePlumbingSubOptionIds(
  details: PlumberDetails | null | undefined,
): PlumbingSubOptionId[] {
  if (!details) return [];
  return details.selectedSubOptions ?? [];
}

export function buildPlumbingUnitRateOptions(
  subOptionIds: PlumbingSubOptionId[],
  quantities?: Partial<Record<PlumbingSubOptionId, number>>,
): PlumbingBidOption[] {
  return subOptionIds.flatMap((id, index) => {
    const option = getPlumbingSubOption(id);
    if (!option) return [];
    const qty = quantities?.[id];
    const qtyLabel = qty && qty > 0 ? ` × ${qty}` : '';
    const isPiping = option.isPiping === true || option.unitType === 'per_sqft';
    return [{
      id: option.id,
      shortLabel: `${option.label}${qtyLabel}`,
      label: `${optionLetter(index)}: ${option.label}${qtyLabel}`,
      unit: 'per_unit' as const,
      unitSuffix: option.unitSuffix,
      weight: option.weight,
      note: option.note,
      isPiping,
      unitType: option.unitType ?? (isPiping ? 'per_sqft' : 'per_unit'),
    }];
  });
}

export function plumbingPackageGroupsForOptions(options: PlumbingBidOption[]): Array<{
  id: string;
  label: string;
  options: PlumbingBidOption[];
}> {
  if (options.length > 0 && options.every(isPlumbingFixtureRateOption)) {
    return [{ id: 'fixtures', label: PLUMBING_FIXTURE_RATE_SECTION_TITLE, options }];
  }
  const byId = new Map(options.map((option) => [option.id, option]));
  const grouped = PLUMBING_SCOPE_PACKAGES.flatMap((pkg) => {
    const groupOptions = pkg.options.flatMap((item) => {
      const match = byId.get(item.id);
      return match ? [match] : [];
    });
    if (groupOptions.length === 0) return [];
    return [{ id: pkg.id, label: pkg.label, options: groupOptions }];
  });
  const groupedIds = new Set(grouped.flatMap((group) => group.options.map((option) => option.id)));
  const leftover = options.filter((option) => !groupedIds.has(option.id));
  if (leftover.length === 0) return grouped;
  return [...grouped, { id: 'other', label: 'Other Work Specifications', options: leftover }];
}

export function countPlumbingBidOptions(input: PlumbingBidOptionInput): number {
  return buildPlumbingBidOptions(input).length;
}

/** Section header for the per-fixture rate inputs. */
export const PLUMBING_FIXTURE_RATE_SECTION_TITLE = 'Fixture-wise Piping & Fitting Rates (₹ per fixture)';

/** Every fixture rate must cover the complete job. */
export const PLUMBING_FIXTURE_RATE_INCLUSION_NOTE =
  'Each rate must include complete work: Concealed / Non-concealed piping + plaster cutting + final chinaware / CP fitting.';

const PLUMBING_FIXTURE_RATE_META: Partial<
  Record<PlumbingFixtureKind, { title: string; explanation: string }>
> = {
  basin: {
    title: 'Basin Piping & Fitting Rate',
    explanation: 'Basin (Includes water supply & waste piping + final basin & CP fitting)',
  },
  taps: {
    title: 'Taps Piping & Fitting Rate',
    explanation: 'Taps (Includes water line piping + final CP tap fitting)',
  },
  shower: {
    title: 'Shower Piping & Fitting Rate',
    explanation: 'Shower (Includes water line piping + final shower fitting)',
  },
  geyser: {
    title: 'Geyser Piping & Fitting Rate',
    explanation: 'Geyser (Includes Hot & Cold Inlet/Outlet piping + final fitting)',
  },
  commode: {
    title: 'Western Commode Piping & Fitting Rate',
    explanation:
      'Western Commode (Includes water & waste pipeline connection + final chinaware fitting)',
  },
  indian_pan: {
    title: 'Indian Toilet Pan Piping & Fitting Rate',
    explanation: 'Indian Toilet Pan (Includes waste pipeline connection + final pan fitting)',
  },
  washing_machine: {
    title: 'Washing Machine Point Rate',
    explanation: 'Washing Machine Point (Includes inlet/outlet piping + final tap & valve fitting)',
  },
};

export const PLUMBING_FIXTURE_RATE_ID_PREFIX = 'fixture:';

export function isPlumbingFixtureRateOption(option: Pick<PlumbingBidOption, 'id'>): boolean {
  return option.id.startsWith(PLUMBING_FIXTURE_RATE_ID_PREFIX);
}

/**
 * Independent per-fixture bid options. Quantity is the actual fixture count summed
 * across the owner's selected floors — no point multipliers.
 */
export function buildPlumbingFixtureRateOptions(
  floors: PlumbingFloorFixtureCounts[] | null | undefined,
): PlumbingBidOption[] {
  if (!floors?.length) return [];
  return PLUMBING_FLOOR_FIXTURE_FIELDS.flatMap((field) => {
    const meta = PLUMBING_FIXTURE_RATE_META[field.key];
    if (!meta) return [];
    const quantity = floors.reduce((sum, floor) => sum + (floor[field.key] ?? 0), 0);
    if (quantity <= 0) return [];
    return [{
      id: `${PLUMBING_FIXTURE_RATE_ID_PREFIX}${field.key}`,
      shortLabel: meta.title,
      label: meta.title,
      unit: 'per_unit' as const,
      unitSuffix: '/unit',
      weight: 1,
      note: `${meta.explanation} × ${quantity}`,
      unitType: 'per_unit' as const,
      quantity,
      fixtureKind: field.key,
    }];
  });
}

/** +5% of the Ground Floor base rate for each storey above ground. */
export const PLUMBING_UPPER_FLOOR_ALLOWANCE = 0.05;

export const PLUMBING_FLOOR_HEIGHT_ALLOWANCE_NOTE =
  'Note: Rates entered above apply to Ground Floor as Base Rate. An automatic +5% labor allowance per upper floor (1st Floor: +5%, 2nd Floor: +10%, etc.) is automatically added to the Total Estimated Project Cost.';

const PLUMBING_FLOOR_HEIGHT_STEPS: Record<Exclude<PlumbingTargetFloor, 'custom'>, number> = {
  ground: 0,
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
};

export interface PlumbingFixtureBidContext {
  floors?: PlumbingFloorFixtureCounts[] | null;
  customTargetFloors?: number[] | string | null;
  houseStructure?: PlumbingHouseStructure | null;
}

/** Floors above ground. Ground Floor is 0 so its multiplier stays 100%. */
export function plumbingFloorHeightSteps(
  floor: PlumbingTargetFloor,
  customTargetFloors?: number[] | string | null,
): number {
  if (floor !== 'custom') return PLUMBING_FLOOR_HEIGHT_STEPS[floor];
  const listed = normalizeCustomFloors(customTargetFloors);
  if (listed.length === 0) return MIN_CUSTOM_RCC_FLOOR;
  // Custom floors share one quantity group. Price that group at its highest floor.
  return Math.max(...listed);
}

/** Ground = 1, 1st = 1.05, 2nd = 1.10, 3rd = 1.15, and so on. */
export function plumbingFloorRateMultiplier(stepsAboveGround: number): number {
  const steps = Number.isFinite(stepsAboveGround) ? Math.max(0, Math.trunc(stepsAboveGround)) : 0;
  return 1 + PLUMBING_UPPER_FLOOR_ALLOWANCE * steps;
}

export function plumbingFixtureKindFromRateId(id: string): PlumbingFixtureKind | null {
  if (!id.startsWith(PLUMBING_FIXTURE_RATE_ID_PREFIX)) return null;
  const kind = id.slice(PLUMBING_FIXTURE_RATE_ID_PREFIX.length);
  return PLUMBING_FIXTURE_KIND_KEYS.includes(kind as PlumbingFixtureKind)
    ? (kind as PlumbingFixtureKind)
    : null;
}

export function plumbingFixtureBidContextFromProject(project: {
  trade_details?: unknown;
  sub_configuration?: unknown;
}): PlumbingFixtureBidContext {
  const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  if (!details || details.service !== 'plumber') return {};
  return {
    floors: details.floorFixtureCounts ?? [],
    customTargetFloors: details.customTargetFloors ?? null,
    houseStructure: details.houseStructure ?? null,
  };
}

function roundRupee(amount: number): number {
  return Math.round(amount);
}

function fixtureRateForKind(
  unitRates: Record<string, number>,
  kind: PlumbingFixtureKind,
): number {
  return unitRates[`${PLUMBING_FIXTURE_RATE_ID_PREFIX}${kind}`] ?? 0;
}

/**
 * Total Estimated Project Cost = Σ (floor quantity × Ground Floor base rate × floor multiplier).
 * Falls back to Σ (quantity × rate) when the project has no per-floor fixture counts.
 */
export function computePlumbingFixtureBidTotal(
  unitRates: Record<string, number>,
  options: Array<Pick<PlumbingBidOption, 'id' | 'quantity' | 'fixtureKind'>>,
  context?: PlumbingFixtureBidContext | null,
): number {
  const floors = context?.floors ?? [];
  if (floors.length > 0 && options.some((option) => isPlumbingFixtureRateOption(option))) {
    return floors.reduce((sum, floor) => {
      const multiplier = plumbingFloorRateMultiplier(
        plumbingFloorHeightSteps(floor.floor, context?.customTargetFloors),
      );
      return PLUMBING_FLOOR_FIXTURE_FIELDS.reduce((floorSum, field) => {
        const quantity = floor[field.key] ?? 0;
        const rate = fixtureRateForKind(unitRates, field.key);
        if (quantity <= 0 || rate <= 0) return floorSum;
        return floorSum + roundRupee(quantity * rate * multiplier);
      }, sum);
    }, 0);
  }

  return options.reduce((sum, option) => {
    const quantity = option.quantity ?? 0;
    const rate = unitRates[option.id] ?? 0;
    if (quantity <= 0 || rate <= 0) return sum;
    return sum + roundRupee(quantity * rate);
  }, 0);
}

/** One fixture's floor-adjusted line, for the bidding form preview. */
export function describePlumbingFixtureLineCost(
  fixtureKind: PlumbingFixtureKind,
  rate: number,
  context?: PlumbingFixtureBidContext | null,
): { quantity: number; amount: number; summary: string } {
  const floors = (context?.floors ?? []).filter((floor) => (floor[fixtureKind] ?? 0) > 0);
  const quantity = floors.reduce((sum, floor) => sum + (floor[fixtureKind] ?? 0), 0);
  if (quantity <= 0) return { quantity: 0, amount: 0, summary: '' };
  if (!(rate > 0)) return { quantity, amount: 0, summary: `Total quantity: ${quantity}` };

  const slices = floors.map((floor) => {
    const floorQuantity = floor[fixtureKind] ?? 0;
    const steps = plumbingFloorHeightSteps(floor.floor, context?.customTargetFloors);
    const multiplier = plumbingFloorRateMultiplier(steps);
    return {
      steps,
      amount: roundRupee(floorQuantity * rate * multiplier),
      label: plumbingFloorLabel(floor.floor, context?.customTargetFloors, context?.houseStructure),
    };
  });
  const amount = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (slices.every((slice) => slice.steps === 0)) {
    return {
      quantity,
      amount,
      summary: `Total quantity: ${quantity} × ₹${rate.toLocaleString('en-IN')} = ₹${amount.toLocaleString('en-IN')}`,
    };
  }
  const parts = slices.map((slice) => `${slice.label}: ₹${slice.amount.toLocaleString('en-IN')}`);
  return {
    quantity,
    amount,
    summary: `Total quantity: ${quantity} · ${parts.join(' · ')} · line total ₹${amount.toLocaleString('en-IN')}`,
  };
}

export interface PlumbingFixtureMeasurementLine {
  id: string;
  group: string;
  label: string;
  rate: number;
  rateMultiplier?: number;
  ownerQuantity: number;
}

/** Per-floor measurement lines so site totals use the same floor-height multipliers as the bid. */
export function buildPlumbingFixtureMeasurementLines(
  unitRates: Record<string, number>,
  options: PlumbingBidOption[],
  context?: PlumbingFixtureBidContext | null,
): PlumbingFixtureMeasurementLine[] {
  const priced = options.filter((option) => (unitRates[option.id] ?? 0) > 0);
  const floors = context?.floors ?? [];
  const splitByFloor =
    floors.length > 1 ||
    floors.some(
      (floor) => plumbingFloorHeightSteps(floor.floor, context?.customTargetFloors) > 0,
    );

  if (!splitByFloor) {
    return priced.flatMap((option) => {
      const rate = unitRates[option.id] ?? 0;
      const ownerQuantity = option.quantity ?? 0;
      if (!(ownerQuantity > 0)) return [];
      return [{
        id: `opt:${option.id}`,
        group: 'Fixture piping & fitting',
        label: option.shortLabel,
        rate,
        ownerQuantity,
      }];
    });
  }

  return floors.flatMap((floor) => {
    const steps = plumbingFloorHeightSteps(floor.floor, context?.customTargetFloors);
    const multiplier = plumbingFloorRateMultiplier(steps);
    const group = plumbingFloorLabel(
      floor.floor,
      context?.customTargetFloors,
      context?.houseStructure,
    );
    return priced.flatMap((option) => {
      if (!option.fixtureKind) return [];
      const ownerQuantity = floor[option.fixtureKind] ?? 0;
      const rate = unitRates[option.id] ?? 0;
      if (!(ownerQuantity > 0) || !(rate > 0)) return [];
      return [{
        id: `opt:${option.id}:${floor.floor}`,
        group,
        label: option.shortLabel,
        rate,
        ...(multiplier !== 1 ? { rateMultiplier: multiplier } : {}),
        ownerQuantity,
      }];
    });
  });
}

export function buildPlumbingBidOptions(input: PlumbingBidOptionInput): PlumbingBidOption[] {
  const fixtureOptions = buildPlumbingFixtureRateOptions(input.floorFixtureCounts);
  if (fixtureOptions.length > 0) return fixtureOptions;

  const selectedSubOptions = input.selectedSubOptions ?? [];
  if (selectedSubOptions.length > 0) {
    return buildPlumbingUnitRateOptions(
      selectedSubOptions,
      plumbingSubOptionQuantities(input.floorFixtureCounts, {
        waterTankConnections: input.waterTankConnections,
        motorConnections: input.motorConnections,
      }),
    );
  }

  const active = activeBathroomPackageSelections(input.bathroomPackages);
  const hasPackageSystem = active.length > 0 || Boolean(input.pipingPackage);

  if (hasPackageSystem) {
    const piping = input.pipingPackage ?? null;
    const tap = tapWaterOption(piping);
    const drain = toiletDrainOption();
    if (active.length === 0) {
      return withLetters([tap, drain]);
    }
    if (active.length > 2) {
      const summary = active.map(formatBathroomPackageItem).join(' + ');
      return withLetters([
        {
          id: 'package:mixed',
          shortLabel: `Bathroom Package Rate — ${summary}`,
          unit: 'package',
          unitSuffix: '/unit',
          weight: 1,
        },
        tap,
        drain,
      ]);
    }
    return withLetters([...active.map(bathroomRateOption), tap, drain]);
  }

  const options: Omit<PlumbingBidOption, 'label'>[] = [];
  if (input.bathroomPackage) {
    const packageName = getBathroomPackageLabel(input.bathroomPackage);
    options.push({
      id: `package:${input.bathroomPackage}`,
      shortLabel: packageName
        ? `Bathroom Package Rate — ${packageName}`
        : 'Bathroom Package Rate',
      unit: 'package',
      unitSuffix: '/unit',
      weight: 1,
    });
  }

  for (const size of input.cpvcPipeSizes) {
    for (const method of input.waterInstallMethods) {
      options.push({
        id: `cpvc:${size}:${method}`,
        shortLabel: `Tap Water Pipe — ${size} / ${method}`,
        unit: 'per_running_foot',
        unitSuffix: '/Rft',
        weight: 1,
      });
    }
  }

  if (input.includeToiletWastePipe) {
    for (const method of input.drainageInstallMethods) {
      options.push({
        id: `swr:4inch:${method}`,
        shortLabel: `Toilet Drainage Pipe — ${method}`,
        unit: 'per_running_foot',
        unitSuffix: '/Rft',
        weight: 1,
      });
    }
  }

  return withLetters(options);
}

export function plumbingInputFromDetails(details: PlumberDetails): PlumbingBidOptionInput {
  return {
    bathroomPackage: details.bathroomPackage ?? null,
    bathroomPackages: details.bathroomPackages,
    pipingPackage: details.pipingPackage ?? null,
    selectedSubOptions: details.selectedSubOptions,
    floorFixtureCounts: details.floorFixtureCounts,
    waterTankConnections: details.waterTankConnections,
    motorConnections: details.motorConnections,
    cpvcPipeSizes: details.cpvcPipeSizes ?? [],
    waterInstallMethods: details.waterInstallMethods ?? [],
    includeToiletWastePipe: details.includeToiletWastePipe === true,
    drainageInstallMethods: details.drainageInstallMethods ?? [],
  };
}

export function resolvePlumbingBidOptions(raw: unknown): PlumbingBidOption[] {
  const details = parseTradeDetails(raw);
  if (!details || details.service !== 'plumber') return [];
  const input = plumbingInputFromDetails(details);
  if (countPlumbingBidOptions(input) < 1) return [];
  return buildPlumbingBidOptions(input);
}

export function hasPlumbingMultiOptionBid(raw: unknown): boolean {
  return resolvePlumbingBidOptions(raw).length > 0;
}

export function isPlumbingUnitRateProject(raw: unknown): boolean {
  const details = parseTradeDetails(raw);
  return Boolean(details && details.service === 'plumber' && hasPlumbingUnitRateScope(details));
}

export const PLUMBING_RUNNING_FOOT_RATE_KEY = 'running_foot';
export const PLUMBING_POINT_RATE_PREFIX = 'point:';

const POINT_RATE_FLOOR_KEYS = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'] as const;

export function plumbingPointRateKey(floor: PlumbingTargetFloor): string {
  return `${PLUMBING_POINT_RATE_PREFIX}${floor}`;
}

export function isPlumbingPointRateProject(raw: unknown): boolean {
  const details = parseTradeDetails(raw);
  return Boolean(details && details.service === 'plumber' && hasPlumbingPointRateScope(details));
}

export function readPlumbingPointRateFloors(project: {
  trade_details?: unknown;
  sub_configuration?: unknown;
}): Array<{
  floor: PlumbingTargetFloor;
  label: string;
  points: number;
  breakdown: string;
  counts: PlumbingFloorFixtureCounts;
}> {
  const details = parseTradeDetails(
    readNestedProjectDetail(project, 'trade_details'),
  );
  if (!details || details.service !== 'plumber' || !details.floorFixtureCounts?.length) {
    return [];
  }
  return details.floorFixtureCounts.map((item) => ({
    floor: item.floor,
    label: plumbingFloorLabel(item.floor, details.customTargetFloors, details.houseStructure),
    points: plumbingFloorPoints(item),
    breakdown: formatPlumbingFloorPointBreakdown(item),
    counts: item,
  }));
}

export function readProjectPlumbingBidOptions(project: {
  trade_details?: unknown;
  sub_configuration?: unknown;
}): PlumbingBidOption[] {
  return resolvePlumbingBidOptions(readNestedProjectDetail(project, 'trade_details'));
}

export function getPipingPackageBidCaption(kind: PipingPackageKind | null | undefined): string {
  return getPipingPackageLabel(kind);
}

export function parsePlumbingUnitRates(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(amount) && amount > 0) next[key] = amount;
  }
  return next;
}

export function plumbingWeightageContextFromDetails(
  details: PlumberDetails | null | undefined,
): PlumbingWeightageContext {
  if (!details) return {};
  return {
    builtUpArea: details.approxBuiltUpAreaSqft ?? null,
    structureType: details.houseStructure
      ? getPlumbingHouseStructureLabel(details.houseStructure)
      : null,
  };
}

export function plumbingWeightageContextFromProject(project: {
  trade_details?: unknown;
}): PlumbingWeightageContext {
  const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  if (!details || details.service !== 'plumber') return {};
  return plumbingWeightageContextFromDetails(details);
}

export function computePlumbingWeightedIndex(
  unitRates: Record<string, number>,
  options: Array<Pick<PlumbingBidOption, 'id' | 'weight' | 'isPiping' | 'unitType'>>,
  context?: PlumbingWeightageContext,
): number {
  const result = computeBaselineWeightedScore({
    builtUpArea: context?.builtUpArea,
    structureType: context?.structureType,
    selectedSubOptions: options.map((option) => ({
      plumberBidRate: unitRates[option.id] ?? 0,
      unitType: option.unitType,
      isPiping: option.isPiping === true || option.unitType === 'per_sqft',
    })),
  });
  return result.finalWeightedScore;
}

export function computePlumbingUnitRateSum(
  unitRates: Record<string, number>,
  optionIds: string[],
): number {
  return optionIds.reduce((sum, id) => sum + (unitRates[id] ?? 0), 0);
}

export function getPlumbingUnitRateDisplayEntries(
  rates: { unit_rates?: Record<string, number> } | null | undefined,
  options: PlumbingBidOption[],
): Array<{ label: string; value: number; suffix: string }> {
  const unitRates = parsePlumbingUnitRates(rates?.unit_rates);
  return options.flatMap((option) => {
    const value = unitRates[option.id];
    if (value == null || value <= 0) return [];
    return [{ label: option.shortLabel, value, suffix: option.unitSuffix }];
  });
}

export function validatePlumbingUnitRateInputs(
  unitRates: Record<string, number>,
  options: PlumbingBidOption[],
  rules?: { requireMultipleOfFive?: boolean },
): { valid: boolean; errors: Record<string, string>; message: string | null } {
  const errors: Record<string, string> = {};
  for (const option of options) {
    const value = unitRates[option.id];
    if (value === undefined || value <= 0) {
      errors[option.id] = 'Enter a rate greater than zero.';
      continue;
    }
    const fieldError = getBidRateFieldError(value, rules);
    if (fieldError) errors[option.id] = fieldError;
  }
  const firstError = options.map((option) => errors[option.id]).find(Boolean) ?? null;
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    message: firstError,
  };
}

export function buildPlumbingUnitRatePayload(
  unitRates: Record<string, number>,
  options: PlumbingBidOption[],
  context?: PlumbingWeightageContext,
  fixtureContext?: PlumbingFixtureBidContext | null,
): {
  ground_rate: number;
  unit_rates: Record<string, number>;
  weighted_index: number;
  bid_unit: 'per_point';
  total_bid_amount?: number;
  total_estimated_cost?: number;
} {
  const cleaned: Record<string, number> = {};
  for (const option of options) {
    const value = unitRates[option.id];
    if (value != null && value > 0) cleaned[option.id] = value;
  }
  const weightedIndex = computePlumbingWeightedIndex(cleaned, options, context);
  // Per-fixture bids rank on Σ (qty × rate); other unit-rate bids keep the weighted index.
  const fixtureTotal = options.some(isPlumbingFixtureRateOption)
    ? computePlumbingFixtureBidTotal(cleaned, options, fixtureContext)
    : 0;
  return {
    ground_rate: rankingRateFromWeightedScore(weightedIndex),
    unit_rates: cleaned,
    weighted_index: weightedIndex,
    bid_unit: 'per_point',
    ...(fixtureTotal > 0
      ? { total_bid_amount: fixtureTotal, total_estimated_cost: fixtureTotal }
      : {}),
  };
}

export function parsePlumbingRunningFootRate(rates: {
  running_foot_rate?: number | string | null;
  unit_rates?: Record<string, number> | null;
} | null | undefined): number | null {
  const dedicated = Number(rates?.running_foot_rate);
  if (Number.isFinite(dedicated) && dedicated > 0) return dedicated;
  const nested = rates?.unit_rates?.[PLUMBING_RUNNING_FOOT_RATE_KEY];
  if (typeof nested === 'number' && Number.isFinite(nested) && nested > 0) return nested;
  return null;
}

export function parsePlumbingPointRateInputs(
  rates: { unit_rates?: Record<string, number> | null } | null | undefined,
  floors: Array<{ floor: PlumbingTargetFloor }>,
): Record<string, number> {
  const unitRates = parsePlumbingUnitRates(rates?.unit_rates);
  const next: Record<string, number> = {};
  for (const item of floors) {
    const key = plumbingPointRateKey(item.floor);
    const value = unitRates[key];
    if (typeof value === 'number' && value > 0) next[key] = value;
  }
  return next;
}

export function plumbingPointRatesToFloorKeys(
  pointRates: Record<string, number>,
  floors: Array<{ floor: PlumbingTargetFloor }>,
): Partial<Record<(typeof POINT_RATE_FLOOR_KEYS)[number], number>> {
  const next: Partial<Record<(typeof POINT_RATE_FLOOR_KEYS)[number], number>> = {};
  floors.forEach((item, index) => {
    const floorKey = POINT_RATE_FLOOR_KEYS[index];
    if (!floorKey) return;
    const value = pointRates[plumbingPointRateKey(item.floor)];
    if (value != null && value > 0) next[floorKey] = value;
  });
  return next;
}

export function computePlumbingPointBidTotal(
  pointRates: Record<string, number>,
  floors: Array<{ floor: PlumbingTargetFloor; points: number }>,
): number {
  return floors.reduce((sum, item) => {
    const rate = pointRates[plumbingPointRateKey(item.floor)] ?? 0;
    return sum + item.points * rate;
  }, 0);
}

export function buildPlumbingPointRatePayload(
  pointRates: Record<string, number>,
  floors: Array<{ floor: PlumbingTargetFloor; points: number }>,
  runningFootRate?: number | null,
): {
  ground_rate: number;
  first_rate?: number;
  second_rate?: number;
  third_rate?: number;
  unit_rates: Record<string, number>;
  running_foot_rate?: number;
  bid_unit: 'per_point';
  total_bid_amount: number;
  total_estimated_cost: number;
} {
  const unitRates: Record<string, number> = {};
  const amounts: number[] = [];
  floors.forEach((item, index) => {
    const rate = pointRates[plumbingPointRateKey(item.floor)] ?? 0;
    unitRates[plumbingPointRateKey(item.floor)] = rate;
    amounts[index] = item.points * rate;
  });
  const running = runningFootRate != null && runningFootRate > 0 ? runningFootRate : null;
  if (running != null) unitRates[PLUMBING_RUNNING_FOOT_RATE_KEY] = running;
  const total = amounts.reduce((sum, value) => sum + (Number(value) || 0), 0);
  return {
    ground_rate: amounts[0] ?? 0,
    first_rate: amounts[1],
    second_rate: amounts[2],
    third_rate: amounts[3],
    unit_rates: unitRates,
    ...(running != null ? { running_foot_rate: running } : {}),
    bid_unit: 'per_point',
    total_bid_amount: total,
    total_estimated_cost: total,
  };
}

export function getPlumbingPointRateDisplayEntries(
  rates: {
    unit_rates?: Record<string, number> | null;
    running_foot_rate?: number | null;
  } | null | undefined,
  floors: Array<{ floor: PlumbingTargetFloor; label: string; points: number }>,
): Array<{ label: string; value: number; suffix: string }> {
  const pointRates = parsePlumbingPointRateInputs(rates, floors);
  return floors.flatMap((item) => {
    const value = pointRates[plumbingPointRateKey(item.floor)];
    if (value == null || value <= 0) return [];
    return [{
      label: item.label,
      value,
      suffix: '/point',
    }];
  });
}
