import {
  computeBaselineWeightedScore,
  rankingRateFromWeightedScore,
} from '@/lib/bidding-calculator';
import { getBidRateFieldError } from '@/lib/validation/bidRates';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  ELECTRICIAN_LABOUR_ONLY_DISCLAIMER,
  ELECTRICIAN_SCOPE_PACKAGES,
  electricianFloorPoints,
  formatElectricianFloorPointBreakdown,
  getElectricianSubOption,
  getPlumbingHouseStructureLabel,
  hasElectricianPointRateScope,
  hasElectricianUnitRateScope,
  parseTradeDetails,
  plumbingFloorLabel,
  type ElectricianDetails,
  type ElectricianFloorFixtureCounts,
  type ElectricianSubOptionId,
  type PlumbingTargetFloor,
} from '@/lib/tradeWorkDetails';

export { ELECTRICIAN_LABOUR_ONLY_DISCLAIMER };

export interface ElectricianBidOption {
  id: string;
  shortLabel: string;
  label: string;
  unitSuffix: string;
  weight: number;
  note?: string;
  isWiringOrPiping?: boolean;
  unitType?: 'per_sqft' | 'per_unit';
}

export interface ElectricianWeightageContext {
  builtUpArea?: number | string | null;
  structureType?: string | null;
}

function optionLetter(index: number): string {
  return `Option ${String.fromCharCode(65 + index)}`;
}

export function buildElectricianUnitRateOptions(
  subOptionIds: ElectricianSubOptionId[],
): ElectricianBidOption[] {
  return subOptionIds.flatMap((id, index) => {
    const option = getElectricianSubOption(id);
    if (!option) return [];
    const isWiringOrPiping =
      option.isWiringOrPiping === true || option.unitType === 'per_sqft';
    return [{
      id: option.id,
      shortLabel: option.label,
      label: `${optionLetter(index)}: ${option.label}`,
      unitSuffix: option.unitSuffix,
      weight: option.weight,
      note: option.note,
      isWiringOrPiping,
      unitType: option.unitType ?? (isWiringOrPiping ? 'per_sqft' : 'per_unit'),
    }];
  });
}

export function electricianPackageGroupsForOptions(options: ElectricianBidOption[]): Array<{
  id: string;
  label: string;
  options: ElectricianBidOption[];
}> {
  const byId = new Map(options.map((option) => [option.id, option]));
  const grouped = ELECTRICIAN_SCOPE_PACKAGES.flatMap((pkg) => {
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

export function resolveElectricianBidOptions(raw: unknown): ElectricianBidOption[] {
  const details = parseTradeDetails(raw);
  if (!details || details.service !== 'electrician') return [];
  const subOptionIds = details.selectedSubOptions ?? [];
  if (subOptionIds.length === 0) return [];
  return buildElectricianUnitRateOptions(subOptionIds);
}

export function isElectricianUnitRateProject(raw: unknown): boolean {
  const details = parseTradeDetails(raw);
  return Boolean(details && details.service === 'electrician' && hasElectricianUnitRateScope(details));
}

export function readProjectElectricianBidOptions(project: {
  trade_details?: unknown;
}): ElectricianBidOption[] {
  return resolveElectricianBidOptions(readNestedProjectDetail(project, 'trade_details'));
}

export function parseElectricianUnitRates(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(amount) && amount > 0) next[key] = amount;
  }
  return next;
}

export function electricianWeightageContextFromDetails(
  details: ElectricianDetails | null | undefined,
): ElectricianWeightageContext {
  if (!details) return {};
  return {
    builtUpArea: details.approxBuiltUpAreaSqft ?? null,
    structureType: details.houseStructure
      ? getPlumbingHouseStructureLabel(details.houseStructure)
      : null,
  };
}

export function electricianWeightageContextFromProject(project: {
  trade_details?: unknown;
}): ElectricianWeightageContext {
  const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  if (!details || details.service !== 'electrician') return {};
  return electricianWeightageContextFromDetails(details);
}

export function computeElectricianWeightedIndex(
  unitRates: Record<string, number>,
  options: Array<Pick<ElectricianBidOption, 'id' | 'isWiringOrPiping' | 'unitType'>>,
  context?: ElectricianWeightageContext,
): number {
  const result = computeBaselineWeightedScore({
    builtUpArea: context?.builtUpArea,
    structureType: context?.structureType,
    selectedSubOptions: options.map((option) => ({
      electricianBidRate: unitRates[option.id] ?? 0,
      unitType: option.unitType,
      isWiringOrPiping:
        option.isWiringOrPiping === true || option.unitType === 'per_sqft',
    })),
  });
  return result.finalWeightedScore;
}

export function getElectricianUnitRateDisplayEntries(
  rates: { unit_rates?: Record<string, number> } | null | undefined,
  options: ElectricianBidOption[],
): Array<{ label: string; value: number; suffix: string }> {
  const unitRates = parseElectricianUnitRates(rates?.unit_rates);
  return options.flatMap((option) => {
    const value = unitRates[option.id];
    if (value == null || value <= 0) return [];
    return [{ label: option.shortLabel, value, suffix: option.unitSuffix }];
  });
}

export function validateElectricianUnitRateInputs(
  unitRates: Record<string, number>,
  options: ElectricianBidOption[],
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

export function buildElectricianUnitRatePayload(
  unitRates: Record<string, number>,
  options: ElectricianBidOption[],
  context?: ElectricianWeightageContext,
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
  const weightedIndex = computeElectricianWeightedIndex(cleaned, options, context);
  return {
    ground_rate: rankingRateFromWeightedScore(weightedIndex),
    unit_rates: cleaned,
    weighted_index: weightedIndex,
    bid_unit: 'per_point',
  };
}

export const ELECTRICIAN_POINT_RATE_PREFIX = 'point:';

const POINT_RATE_FLOOR_KEYS = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'] as const;

export function electricianPointRateKey(floor: PlumbingTargetFloor): string {
  return `${ELECTRICIAN_POINT_RATE_PREFIX}${floor}`;
}

export function isElectricianPointRateProject(raw: unknown): boolean {
  const details = parseTradeDetails(raw);
  return Boolean(details && details.service === 'electrician' && hasElectricianPointRateScope(details));
}

export function readElectricianPointRateFloors(project: {
  trade_details?: unknown;
  sub_configuration?: unknown;
}): Array<{
  floor: PlumbingTargetFloor;
  label: string;
  points: number;
  breakdown: string;
  counts: ElectricianFloorFixtureCounts;
}> {
  const details = parseTradeDetails(
    readNestedProjectDetail(project, 'trade_details'),
  );
  if (!details || details.service !== 'electrician' || !details.floorFixtureCounts?.length) {
    return [];
  }
  return details.floorFixtureCounts.map((item) => ({
    floor: item.floor,
    label: plumbingFloorLabel(item.floor, details.customTargetFloors),
    points: electricianFloorPoints(item),
    breakdown: formatElectricianFloorPointBreakdown(item),
    counts: item,
  }));
}

export function parseElectricianPointRateInputs(
  rates: { unit_rates?: Record<string, number> | null } | null | undefined,
  floors: Array<{ floor: PlumbingTargetFloor }>,
): Record<string, number> {
  const unitRates = parseElectricianUnitRates(rates?.unit_rates);
  const next: Record<string, number> = {};
  for (const item of floors) {
    const key = electricianPointRateKey(item.floor);
    const value = unitRates[key];
    if (typeof value === 'number' && value > 0) next[key] = value;
  }
  return next;
}

export function electricianPointRatesToFloorKeys(
  pointRates: Record<string, number>,
  floors: Array<{ floor: PlumbingTargetFloor }>,
): Partial<Record<(typeof POINT_RATE_FLOOR_KEYS)[number], number>> {
  const next: Partial<Record<(typeof POINT_RATE_FLOOR_KEYS)[number], number>> = {};
  floors.forEach((item, index) => {
    const floorKey = POINT_RATE_FLOOR_KEYS[index];
    if (!floorKey) return;
    const value = pointRates[electricianPointRateKey(item.floor)];
    if (value != null && value > 0) next[floorKey] = value;
  });
  return next;
}

export function computeElectricianPointBidTotal(
  pointRates: Record<string, number>,
  floors: Array<{ floor: PlumbingTargetFloor; points: number }>,
): number {
  return floors.reduce((sum, item) => {
    const rate = pointRates[electricianPointRateKey(item.floor)] ?? 0;
    return sum + item.points * rate;
  }, 0);
}

export function buildElectricianPointRatePayload(
  pointRates: Record<string, number>,
  floors: Array<{ floor: PlumbingTargetFloor; points: number }>,
): {
  ground_rate: number;
  first_rate?: number;
  second_rate?: number;
  third_rate?: number;
  unit_rates: Record<string, number>;
  bid_unit: 'per_point';
  total_bid_amount: number;
} {
  const unitRates: Record<string, number> = {};
  const amounts: number[] = [];
  floors.forEach((item, index) => {
    const rate = pointRates[electricianPointRateKey(item.floor)] ?? 0;
    unitRates[electricianPointRateKey(item.floor)] = rate;
    amounts[index] = item.points * rate;
  });
  const total = amounts.reduce((sum, value) => sum + value, 0);
  return {
    ground_rate: amounts[0] ?? 0,
    first_rate: amounts[1],
    second_rate: amounts[2],
    third_rate: amounts[3],
    unit_rates: unitRates,
    bid_unit: 'per_point',
    total_bid_amount: total,
  };
}

export function getElectricianPointRateDisplayEntries(
  rates: { unit_rates?: Record<string, number> | null } | null | undefined,
  floors: Array<{ floor: PlumbingTargetFloor; label: string; points: number }>,
): Array<{ label: string; value: number; suffix: string }> {
  const pointRates = parseElectricianPointRateInputs(rates, floors);
  return floors.flatMap((item) => {
    const value = pointRates[electricianPointRateKey(item.floor)];
    if (value == null || value <= 0) return [];
    return [{
      label: item.label,
      value,
      suffix: '/point',
    }];
  });
}
