import type { BidFloorRateKey, BidRates, ServiceType } from '@/lib/types';
import { getRateKeys } from '@/lib/utils';

export const BID_RATE_ERROR =
  'Rate must end in 0 or 5 (e.g., 1230, 1235).';

/** Only these services still require rates ending in 0 or 5. All others accept 0–9. */
export const MULTIPLE_OF_FIVE_SERVICES = [
  'plumber',
  'earthwork',
  'construction_firm',
] as const;

export const FLEXIBLE_WHOLE_NUMBER_SERVICES = [
  'painter',
  'electrician',
  'carpenter',
  'drawing_design',
  'false_ceiling_work',
] as const;

export interface BidRateRules {
  /** When false, any positive whole number is accepted. Default true for plumber/earthwork/firm. */
  requireMultipleOfFive?: boolean;
}

export function normalizeServiceType(serviceType?: string | null): string {
  return String(serviceType ?? '').trim().toLowerCase();
}

export function allowsAnyWholeNumberRate(...serviceTypes: Array<string | null | undefined>): boolean {
  const normalized = serviceTypes.map(normalizeServiceType).filter(Boolean);
  if (normalized.some((value) => (FLEXIBLE_WHOLE_NUMBER_SERVICES as readonly string[]).includes(value))) {
    return true;
  }
  if (normalized.length === 0) return true;
  return normalized.every(
    (value) => !(MULTIPLE_OF_FIVE_SERVICES as readonly string[]).includes(value),
  );
}

export function getBidRateRules(...serviceTypes: Array<ServiceType | string | null | undefined>): BidRateRules {
  return { requireMultipleOfFive: !allowsAnyWholeNumberRate(...serviceTypes) };
}

function requiresMultipleOfFive(rules?: BidRateRules): boolean {
  return rules?.requireMultipleOfFive === true;
}

/** Strip non-digit characters so only whole numbers can be entered. */
export function sanitizeBidRateInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function parseBidRateValue(sanitized: string): number | undefined {
  if (!sanitized) return undefined;
  const value = parseInt(sanitized, 10);
  return Number.isNaN(value) ? undefined : value;
}

export function isValidBidRate(value: number | undefined, rules?: BidRateRules): boolean {
  if (value === undefined || value <= 0) return false;
  if (!Number.isInteger(value)) return false;
  if (!requiresMultipleOfFive(rules)) return true;
  return value % 5 === 0;
}

export function roundBidRateToNearestFive(value: number): number {
  if (value <= 0) return 5;
  const rounded = Math.round(value / 5) * 5;
  return rounded <= 0 ? 5 : rounded;
}

export function getBidRateFieldError(value: number | undefined, rules?: BidRateRules): string | null {
  if (value === undefined || value <= 0) return null;
  if (!Number.isInteger(value)) {
    return 'Rate must be a whole number with no decimals.';
  }
  if (requiresMultipleOfFive(rules) && value % 5 !== 0) return BID_RATE_ERROR;
  return null;
}

export function validateBidRatesForFloorCount(
  rates: Partial<BidRates>,
  floorCount: number,
  rules?: BidRateRules,
): { valid: boolean; errors: Partial<Record<BidFloorRateKey, string>>; message: string | null } {
  const keys = getRateKeys(floorCount);
  const errors: Partial<Record<BidFloorRateKey, string>> = {};

  for (const key of keys) {
    const value = rates[key];
    if (value === undefined || value <= 0) {
      errors[key] = 'Enter a rate greater than zero.';
      continue;
    }
    const fieldError = getBidRateFieldError(value, rules);
    if (fieldError) errors[key] = fieldError;
  }

  const firstError = keys.map((k) => errors[k]).find(Boolean) ?? null;
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    message: firstError,
  };
}

export function buildBidRatesPayload(
  rates: Partial<BidRates>,
  floorCount: number,
): BidRates {
  return {
    ground_rate: rates.ground_rate ?? 0,
    first_rate: floorCount >= 2 ? (rates.first_rate ?? 0) : undefined,
    second_rate: floorCount >= 3 ? (rates.second_rate ?? 0) : undefined,
    third_rate: floorCount >= 4 ? (rates.third_rate ?? 0) : undefined,
    ...(rates.bid_unit ? { bid_unit: rates.bid_unit } : {}),
    ...(rates.vehicleCapacityCum != null && rates.vehicleCapacityCum > 0
      ? { vehicleCapacityCum: rates.vehicleCapacityCum }
      : {}),
    ...(rates.unit_rates && Object.keys(rates.unit_rates).length > 0
      ? { unit_rates: rates.unit_rates }
      : {}),
    ...(rates.weighted_index != null && rates.weighted_index > 0
      ? { weighted_index: rates.weighted_index }
      : {}),
    ...(rates.running_foot_rate != null && rates.running_foot_rate > 0
      ? { running_foot_rate: rates.running_foot_rate }
      : {}),
    ...(rates.total_bid_amount != null && rates.total_bid_amount > 0
      ? { total_bid_amount: rates.total_bid_amount }
      : {}),
    ...(rates.total_civil_cost != null && rates.total_civil_cost > 0
      ? { total_civil_cost: rates.total_civil_cost }
      : {}),
    ...(rates.total_flooring_cost != null && rates.total_flooring_cost > 0
      ? { total_flooring_cost: rates.total_flooring_cost }
      : {}),
    ...(rates.total_wall_cost != null && rates.total_wall_cost > 0
      ? { total_wall_cost: rates.total_wall_cost }
      : {}),
    ...(rates.total_project_cost != null && rates.total_project_cost > 0
      ? { total_project_cost: rates.total_project_cost }
      : {}),
    ...(Array.isArray(rates.floor_civil_breakdown) && rates.floor_civil_breakdown.length > 0
      ? { floor_civil_breakdown: rates.floor_civil_breakdown }
      : {}),
    ...(rates.tile_fitting_rate != null && rates.tile_fitting_rate > 0
      ? { tile_fitting_rate: rates.tile_fitting_rate }
      : {}),
    ...(rates.flooring_rates && Object.keys(rates.flooring_rates).length > 0
      ? { flooring_rates: rates.flooring_rates }
      : {}),
    ...(rates.wall_rates && Object.keys(rates.wall_rates).length > 0
      ? { wall_rates: rates.wall_rates }
      : {}),
  };
}

export function ratesToInputStrings(rates: Partial<BidRates>): Partial<Record<BidFloorRateKey, string>> {
  const result: Partial<Record<BidFloorRateKey, string>> = {};
  for (const key of ['ground_rate', 'first_rate', 'second_rate', 'third_rate'] as const) {
    const value = rates[key];
    if (value !== undefined && value > 0) {
      result[key] = String(Math.trunc(value));
    }
  }
  return result;
}

/** Map Postgres trigger / RLS errors to user-friendly bid messages. */
export function parseBidDbError(message: string, serviceType?: string | null): string {
  if (message.includes('bid_rate_must_end_in_0_or_5')) {
    if (allowsAnyWholeNumberRate(serviceType)) {
      return 'Unable to save this bid. Please try again.';
    }
    return BID_RATE_ERROR;
  }
  if (message.includes('bid_rate_must_be_whole_number')) {
    return 'Rate must be a whole number with no decimals.';
  }
  if (message.includes('bid_rate_must_be_positive')) {
    return 'Each floor rate must be greater than zero.';
  }
  return message;
}
