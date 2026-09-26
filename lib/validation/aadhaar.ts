/** 12-digit Aadhaar format check. Does not call UIDAI. */
export function normalizeAadhaarNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 12);
}

export function validateAadhaarNumber(value: string): string | null {
  const digits = normalizeAadhaarNumber(value);
  if (!digits) return 'Aadhaar number is required.';
  if (!/^\d{12}$/.test(digits)) return 'Enter a valid 12-digit Aadhaar number.';
  if (/^(\d)\1{11}$/.test(digits)) return 'Enter a valid 12-digit Aadhaar number.';
  return null;
}
