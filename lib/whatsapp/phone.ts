/** Normalize a stored mobile string to E.164 (defaults India +91). */
export function normalizePhoneE164(raw: string, defaultCountryCode = '91'): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;

  if (raw.trim().startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+${defaultCountryCode}${digits}`;
  }

  if (digits.length === 12 && digits.startsWith(defaultCountryCode)) {
    return `+${digits}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return null;
}
