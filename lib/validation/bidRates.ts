import type { BidFloorRateKey, BidRates, ServiceType } from '@/lib/types';
import { getRateKeys } from '@/lib/utils';

export const BID_RATE_ERROR =
  'Rate must be a whole number greater than zero.';

/** @deprecated All services now accept any positive integer (₹1 step). Kept for call-site compatibility. */
export const MULTIPLE_OF_FIVE_SERVICES = [] as const;

export const FLEXIBLE_WHOLE_NUMBER_SERVICES = [
  'painter',
  'electrician',
  'carpenter',
  'drawing_design',
  'false_ceiling_work',
  'plumber',
  'earthwork',
  'construction_firm',
  'labour_contractor',
] as const;

export interface BidRateRules {
  /** Ignored — any positive whole number is accepted. */
  requireMultipleOfFive?: boolean;
}

export function normalizeServiceType(serviceType?: string | null): string {
  return String(serviceType ?? '').trim().toLowerCase();
}

export function allowsAnyWholeNumberRate(..._serviceTypes: Array<string | null | undefined>): boolean {
  return true;
}

export function getBidRateRules(..._serviceTypes: Array<ServiceType | string | null | undefined>): BidRateRules {
  return { requireMultipleOfFive: false };
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

/** Coerce a rate field to a finite number for form state and submit validation. */
export function toRateNumber(value: unknown): number {
  return Number(value) || 0;
}

export function isValidBidRate(value: number | undefined, _rules?: BidRateRules): boolean {
  if (value === undefined || value <= 0) return false;
  return Number.isInteger(value);
}

export function getBidRateFieldError(value: number | undefined, _rules?: BidRateRules): string | null {
  if (value === undefined || value <= 0) return null;
  if (!Number.isInteger(value)) {
    return 'Rate must be a whole number with no decimals.';
  }
  return null;
}

export function validateBidRatesForFloorCount(
  rates: Partial<BidRates>,
  floorCount: number,
  rules?: BidRateRules,
): { valid: boolean; errors: Partial<Record<BidFloorRateKey, string>>; message: string | null } {
  const keys = getRateKeys(floorCount);
  const errors: Partial<Record<BidFloorRateKey, string>> = {};
  const mistriBreakdown = Array.isArray(rates.floor_civil_breakdown)
    ? rates.floor_civil_breakdown
    : [];
  const skipUnusedMistriFloorKeys = mistriBreakdown.length > 0
    || (rates.flooring_rates != null && Object.keys(rates.flooring_rates).length > 0)
    || (typeof rates.total_project_cost === 'number' && rates.total_project_cost > 0);

  for (const key of keys) {
    const value = toRateNumber(rates[key]);
    if (skipUnusedMistriFloorKeys && value <= 0) {
      continue;
    }
    if (value <= 0) {
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

function optionalPositiveRate(value: unknown): number | undefined {
  const n = toRateNumber(value);
  return n > 0 ? n : undefined;
}

export function buildBidRatesPayload(
  rates: Partial<BidRates>,
  floorCount: number,
): BidRates {
  return {
    ground_rate: optionalPositiveRate(rates.ground_rate) ?? toRateNumber(rates.ground_rate),
    first_rate: floorCount >= 2 ? optionalPositiveRate(rates.first_rate) : undefined,
    second_rate: floorCount >= 3 ? optionalPositiveRate(rates.second_rate) : undefined,
    third_rate: floorCount >= 4 ? optionalPositiveRate(rates.third_rate) : undefined,
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
    ...(rates.floor_rates && Object.keys(rates.floor_rates).length > 0
      ? { floor_rates: rates.floor_rates }
      : {}),
    ...(Array.isArray(rates.floor_rate_breakdown) && rates.floor_rate_breakdown.length > 0
      ? { floor_rate_breakdown: rates.floor_rate_breakdown }
      : {}),
    ...(rates.average_rate != null && rates.average_rate > 0
      ? { average_rate: rates.average_rate }
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
export function parseBidDbError(message: string, _serviceType?: string | null): string {
  if (message.includes('bid_rate_must_end_in_0_or_5')) {
    return 'Unable to save this bid. Please try again.';
  }
  if (message.includes('bid_rate_must_be_whole_number')) {
    return 'Rate must be a whole number with no decimals.';
  }
  if (message.includes('bid_rate_must_be_positive')) {
    return 'Each floor rate must be greater than zero.';
  }
  return message;
}
