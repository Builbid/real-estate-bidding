import {
  computeBaselineWeightedScore,
  rankingRateFromWeightedScore,
} from '@/lib/bidding-calculator';
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
  type PlumbingFloorFixtureCounts,
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
  return [...grouped, { id: 'other', label: 'Other Scope', options: leftover }];
}

export function countPlumbingBidOptions(input: PlumbingBidOptionInput): number {
  return buildPlumbingBidOptions(input).length;
}

export function buildPlumbingBidOptions(input: PlumbingBidOptionInput): PlumbingBidOption[] {
  const selectedSubOptions = input.selectedSubOptions ?? [];
  if (selectedSubOptions.length > 0) {
    return buildPlumbingUnitRateOptions(
      selectedSubOptions,
      plumbingSubOptionQuantities(input.floorFixtureCounts),
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
    label: plumbingFloorLabel(item.floor, details.customTargetFloors),
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
): {
  ground_rate: number;
  unit_rates: Record<string, number>;
  weighted_index: number;
  bid_unit: 'per_point';
} {
  const cleaned: Record<string, number> = {};
  for (const option of options) {
    const value = unitRates[option.id];
    if (value != null && value > 0) cleaned[option.id] = value;
  }
  const weightedIndex = computePlumbingWeightedIndex(cleaned, options, context);
  return {
    ground_rate: rankingRateFromWeightedScore(weightedIndex),
    unit_rates: cleaned,
    weighted_index: weightedIndex,
    bid_unit: 'per_point',
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
  return {
    ground_rate: amounts[0] ?? 0,
    first_rate: amounts[1],
    second_rate: amounts[2],
    third_rate: amounts[3],
    unit_rates: unitRates,
    ...(running != null ? { running_foot_rate: running } : {}),
    bid_unit: 'per_point',
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
