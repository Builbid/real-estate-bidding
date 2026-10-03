/**
 * Indian mobile number helpers.
 *
 * Accepts every common way users type a number and reduces it to the bare
 * 10-digit national number:
 *   9876543210, 98765 43210, 09876543210,
 *   +91 98765 43210, +91-9876543210, 91 9876543210, 0091 9876543210
 *
 * The country code is only removed when it is clearly a prefix (explicit "+91" /
 * "0091", or an 11-12 digit value starting with 91 / 0). A plain 10-digit number
 * that merely *begins* with "91" (e.g. 9123456789 — a valid mobile) is kept intact.
 */
export function stripMobileDigits(value: string): string {
  const raw = (value ?? '').trim();
  let digits = raw.replace(/\D/g, '');

  if (/^(\+|00)\s*91/.test(raw)) {
    // Explicit international prefix: +91… / 0091…
    digits = digits.replace(/^(00)?91/, '');
  } else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

/** Alias that makes call sites self-documenting. */
export const normalizeIndianMobile = stripMobileDigits;

export function formatMobileDisplay(value: string): string {
  const digits = stripMobileDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function validateMobile(value: string): string | null {
  const digits = stripMobileDigits(value);
  if (!digits) return 'Mobile number is required.';
  if (digits.length !== 10) return 'Enter a valid 10-digit mobile number.';
  if (!/^[6-9]/.test(digits)) return 'Mobile number must start with 6, 7, 8, or 9.';
  return null;
}

/**
 * E.164 form (+91XXXXXXXXXX) for phone-auth providers and SMS, or null when the
 * input is not a valid Indian mobile number.
 */
export function toIndianE164(value: string): string | null {
  if (validateMobile(value)) return null;
  return `+91${stripMobileDigits(value)}`;
}
