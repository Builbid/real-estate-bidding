export function formatPincodeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

/** Returns an error message, or null when empty (optional) or valid. */
export function validatePincode(value: string): string | null {
  const digits = formatPincodeInput(value);
  if (!digits) return null;
  if (digits.length !== 6) return 'Enter a valid 6-digit pincode.';
  if (digits.startsWith('0')) return 'Enter a valid 6-digit pincode.';
  return null;
}
