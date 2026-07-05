export function stripMobileDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^91/, '').slice(0, 10);
}

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
