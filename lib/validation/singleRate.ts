import {
  BID_RATE_ERROR,
  getBidRateFieldError,
  isValidBidRate,
  parseBidRateValue,
  parseBidDbError,
  sanitizeBidRateInput,
} from '@/lib/validation/bidRates';

export {
  BID_RATE_ERROR,
  parseBidDbError,
  sanitizeBidRateInput,
  parseBidRateValue,
  isValidBidRate,
  getBidRateFieldError,
};

export function validateSingleRate(value: number | undefined): {
  valid: boolean;
  message: string | null;
} {
  if (value === undefined || value <= 0) {
    return { valid: false, message: 'Enter a rate greater than zero.' };
  }
  const fieldError = getBidRateFieldError(value);
  if (fieldError) return { valid: false, message: fieldError };
  return { valid: true, message: null };
}
