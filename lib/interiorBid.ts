import {
  computeBaselineWeightedScore,
  rankingRateFromWeightedScore,
} from '@/lib/bidding-calculator';
import { getBidRateFieldError } from '@/lib/validation/bidRates';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  INTERIOR_DESIGNER_LABOUR_ONLY_DISCLAIMER,
  INTERIOR_DESIGNER_SCOPE_PACKAGES,
  getInteriorDesignerSubOption,
  getPlumbingHouseStructureLabel,
  hasInteriorDesignerUnitRateScope,
  parseTradeDetails,
  type InteriorDetails,
  type InteriorDesignerSubOptionId,
} from '@/lib/tradeWorkDetails';

export { INTERIOR_DESIGNER_LABOUR_ONLY_DISCLAIMER };

export interface InteriorBidOption {
  id: string;
  shortLabel: string;
  label: string;
  unitSuffix: string;
  weight: number;
  note?: string;
  isAreaBased?: boolean;
  unitType?: 'per_sqft' | 'per_unit';
}

export interface InteriorWeightageContext {
  builtUpArea?: number | string | null;
  structureType?: string | null;
}

function optionLetter(index: number): string {
  return `Option ${String.fromCharCode(65 + index)}`;
}

export function buildInteriorUnitRateOptions(
  subOptionIds: InteriorDesignerSubOptionId[],
): InteriorBidOption[] {
  return subOptionIds.flatMap((id, index) => {
    const option = getInteriorDesignerSubOption(id);
    if (!option) return [];
    const isAreaBased = option.isAreaBased === true || option.unitType === 'per_sqft';
    return [{
      id: option.id,
      shortLabel: option.label,
      label: `${optionLetter(index)}: ${option.label}`,
      unitSuffix: option.unitSuffix,
      weight: option.weight,
      note: option.note,
      isAreaBased,
      unitType: option.unitType ?? (isAreaBased ? 'per_sqft' : 'per_unit'),
    }];
  });
}

export function interiorPackageGroupsForOptions(options: InteriorBidOption[]): Array<{
  id: string;
  label: string;
  options: InteriorBidOption[];
}> {
  const byId = new Map(options.map((option) => [option.id, option]));
  const grouped = INTERIOR_DESIGNER_SCOPE_PACKAGES.flatMap((pkg) => {
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

export function resolveInteriorBidOptions(raw: unknown): InteriorBidOption[] {
  const details = parseTradeDetails(raw);
  if (!details || details.service !== 'false_ceiling_work') return [];
  const subOptionIds = details.selectedSubOptions ?? [];
  if (subOptionIds.length === 0) return [];
  return buildInteriorUnitRateOptions(subOptionIds);
}

export function isInteriorUnitRateProject(raw: unknown): boolean {
  const details = parseTradeDetails(raw);
  return Boolean(
    details && details.service === 'false_ceiling_work' && hasInteriorDesignerUnitRateScope(details),
  );
}

export function readProjectInteriorBidOptions(project: {
  trade_details?: unknown;
}): InteriorBidOption[] {
  return resolveInteriorBidOptions(readNestedProjectDetail(project, 'trade_details'));
}

export function parseInteriorUnitRates(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(amount) && amount > 0) next[key] = amount;
  }
  return next;
}

export function interiorWeightageContextFromDetails(
  details: InteriorDetails | null | undefined,
): InteriorWeightageContext {
  if (!details) return {};
  return {
    builtUpArea: details.approxBuiltUpAreaSqft ?? null,
    structureType: details.houseStructure
      ? getPlumbingHouseStructureLabel(details.houseStructure)
      : null,
  };
}

export function interiorWeightageContextFromProject(project: {
  trade_details?: unknown;
}): InteriorWeightageContext {
  const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  if (!details || details.service !== 'false_ceiling_work') return {};
  return interiorWeightageContextFromDetails(details);
}

export function computeInteriorWeightedIndex(
  unitRates: Record<string, number>,
  options: Array<Pick<InteriorBidOption, 'id' | 'isAreaBased' | 'unitType'>>,
  context?: InteriorWeightageContext,
): number {
  const result = computeBaselineWeightedScore({
    builtUpArea: context?.builtUpArea,
    structureType: context?.structureType,
    trade: 'interior',
    selectedSubOptions: options.map((option) => ({
      designerBidRate: unitRates[option.id] ?? 0,
      unitType: option.unitType,
      isAreaBased: option.isAreaBased === true || option.unitType === 'per_sqft',
    })),
  });
  return result.finalWeightedScore;
}

export function getInteriorUnitRateDisplayEntries(
  rates: { unit_rates?: Record<string, number> } | null | undefined,
  options: InteriorBidOption[],
): Array<{ label: string; value: number; suffix: string }> {
  const unitRates = parseInteriorUnitRates(rates?.unit_rates);
  return options.flatMap((option) => {
    const value = unitRates[option.id];
    if (value == null || value <= 0) return [];
    return [{ label: option.shortLabel, value, suffix: option.unitSuffix }];
  });
}

export function validateInteriorUnitRateInputs(
  unitRates: Record<string, number>,
  options: InteriorBidOption[],
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

export function buildInteriorUnitRatePayload(
  unitRates: Record<string, number>,
  options: InteriorBidOption[],
  context?: InteriorWeightageContext,
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
  const weightedIndex = computeInteriorWeightedIndex(cleaned, options, context);
  return {
    ground_rate: rankingRateFromWeightedScore(weightedIndex),
    unit_rates: cleaned,
    weighted_index: weightedIndex,
    bid_unit: 'per_point',
  };
}
