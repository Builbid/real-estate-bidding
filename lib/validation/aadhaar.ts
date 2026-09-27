/** 12-digit identification format check, including dummy test numbers. Does not call UIDAI. */
export function normalizeAadhaarNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 12);
}

export function validateAadhaarNumber(value: string): string | null {
  const digits = normalizeAadhaarNumber(value);
  if (!digits) return 'Aadhaar number is required.';
  if (!/^\d{12}$/.test(digits)) return 'Enter a 12-digit identification number.';
  return null;
}
