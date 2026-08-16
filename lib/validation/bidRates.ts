import type { BidFloorRateKey, BidRates } from '@/lib/types';
import { getRateKeys } from '@/lib/utils';

export const BID_RATE_ERROR =
  'Rate must end in 0 or 5 (e.g., 1230, 1235).';

export interface BidRateRules {
  /** When false, any positive whole number is accepted (painter / electrician). Default true. */
  requireMultipleOfFive?: boolean;
}

function requiresMultipleOfFive(rules?: BidRateRules): boolean {
  return rules?.requireMultipleOfFive !== false;
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
    ...(rates.bid_unit ? { bid_unit: rates.bid_unit } : {}),
    ...(rates.vehicleCapacityCum != null && rates.vehicleCapacityCum > 0
      ? { vehicleCapacityCum: rates.vehicleCapacityCum }
      : {}),
  };
}

export function ratesToInputStrings(rates: Partial<BidRates>): Partial<Record<BidFloorRateKey, string>> {
  const result: Partial<Record<BidFloorRateKey, string>> = {};
  for (const key of ['ground_rate', 'first_rate', 'second_rate'] as const) {
    const value = rates[key];
    if (value !== undefined && value > 0) {
      result[key] = String(Math.trunc(value));
    }
  }
  return result;
}

/** Map Postgres trigger / RLS errors to user-friendly bid messages. */
export function parseBidDbError(message: string): string {
  if (message.includes('bid_rate_must_end_in_0_or_5')) return BID_RATE_ERROR;
  if (message.includes('bid_rate_must_be_whole_number')) {
    return 'Rate must be a whole number with no decimals.';
  }
  if (message.includes('bid_rate_must_be_positive')) {
    return 'Each floor rate must be greater than zero.';
  }
  return message;
}
