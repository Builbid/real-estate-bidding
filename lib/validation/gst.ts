/** 15-char GSTIN: 2-digit state + PAN (10) + entity digit + Z + checksum */
const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstNumber(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return 'GST number is required for construction firms.';
  if (trimmed.length !== 15) return 'GST number must be exactly 15 characters.';
  if (!GSTIN_REGEX.test(trimmed)) {
    return 'Enter a valid 15-character GST Identification Number.';
  }
  return null;
}

export function isValidGstNumber(value: string): boolean {
  return validateGstNumber(value) === null;
}
