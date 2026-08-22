/**
 * Standard Baseline Weightage engine for plumber unit-rate bids.
 *
 * Piping / area-based items: rate × built-up area.
 * Per-piece items (commode, geyser, tank, taps, waste points): rate × 1.
 * RCC Building applies a 1.2 structural complexity multiplier; Assam Type is 1.0.
 */

export const DEFAULT_BUILT_UP_AREA_SQFT = 1000;
export const RCC_STRUCTURAL_MULTIPLIER = 1.2;
export const ASSAM_TYPE_STRUCTURAL_MULTIPLIER = 1.0;

export type BaselineStructureType =
  | 'RCC Building'
  | 'Assam Type'
  | 'rcc'
  | 'assam_type'
  | 'RCC'
  | 'AssamType';

export type BaselineUnitType = 'per_sqft' | 'per_unit' | string;

export interface BaselineWeightageOption {
  plumberBidRate?: number | string | null;
  unitType?: BaselineUnitType | null;
  isPiping?: boolean;
}

export interface ComputeBaselineWeightageInput {
  builtUpArea?: number | string | null;
  structureType?: string | null;
  selectedSubOptions: BaselineWeightageOption[];
}

export interface BaselineWeightageResult {
  area: number;
  structuralMultiplier: number;
  estimatedTotalScore: number;
  finalWeightedScore: number;
}

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function resolveBuiltUpAreaSqft(builtUpArea?: number | string | null): number {
  const area = toNumber(builtUpArea, 0);
  return area > 0 ? area : DEFAULT_BUILT_UP_AREA_SQFT;
}

/** RCC Building → 1.2; Assam Type and unknown → 1.0 */
export function getStructuralMultiplier(structureType?: string | null): number {
  const normalized = String(structureType ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (normalized === 'rcc' || normalized === 'rcc building') return RCC_STRUCTURAL_MULTIPLIER;
  return ASSAM_TYPE_STRUCTURAL_MULTIPLIER;
}

export function isAreaBasedWeightageOption(option: BaselineWeightageOption): boolean {
  return option.isPiping === true || option.unitType === 'per_sqft';
}

export function computeBaselineWeightedScore(
  input: ComputeBaselineWeightageInput,
): BaselineWeightageResult {
  const structuralMultiplier = getStructuralMultiplier(input.structureType);
  const area = resolveBuiltUpAreaSqft(input.builtUpArea);

  let estimatedTotalScore = 0;
  for (const option of input.selectedSubOptions) {
    const bidRate = toNumber(option.plumberBidRate, 0);
    if (isAreaBasedWeightageOption(option)) {
      estimatedTotalScore += bidRate * area;
    } else {
      estimatedTotalScore += bidRate * 1;
    }
  }

  const finalWeightedScore =
    Math.round(estimatedTotalScore * structuralMultiplier * 100) / 100;

  return {
    area,
    structuralMultiplier,
    estimatedTotalScore,
    finalWeightedScore,
  };
}

/** Whole-number ranking key that satisfies plumber bid rate constraints (ends in 0 or 5). */
export function rankingRateFromWeightedScore(score: number): number {
  if (!(score > 0) || !Number.isFinite(score)) return 5;
  const rounded = Math.round(score / 5) * 5;
  return rounded <= 0 ? 5 : rounded;
}
