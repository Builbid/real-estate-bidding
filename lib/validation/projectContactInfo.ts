export const CONTACT_INFO_WARNING =
  '⚠️ Contact details are not allowed in project listings. Phone numbers, emails and personal contact info will be removed to protect your privacy.';

const INDIAN_MOBILE_PATTERN = /(\+91[\-\s]?)?[6-9]\d{9}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CONTACT_KEYWORD_PATTERN =
  /\b(whatsapp|call me|contact me|reach me|my number|phone:|mobile:|dm me|message me|mob:|ph:)\b/gi;
const LONG_DIGIT_PATTERN = /\d[\d\s\-]{9,}\d/g;
const MASKED_NUMBER_PATTERN = /[6-9]\d[\d\s\-]*[xX*]{3,}|\d{2}[xX*]{6,}/g;

function matchesAnyPattern(text: string, pattern: RegExp): boolean {
  pattern.lastIndex = 0;
  return pattern.test(text);
}

/** Returns true when title or description contains blocked contact information. */
export function hasContactInfo(text: string): boolean {
  const value = text.trim();
  if (!value) return false;

  return (
    matchesAnyPattern(value, INDIAN_MOBILE_PATTERN) ||
    matchesAnyPattern(value, EMAIL_PATTERN) ||
    matchesAnyPattern(value, CONTACT_KEYWORD_PATTERN) ||
    matchesAnyPattern(value, LONG_DIGIT_PATTERN) ||
    matchesAnyPattern(value, MASKED_NUMBER_PATTERN)
  );
}

export function hasProjectContactViolation(title: string, description: string): boolean {
  return hasContactInfo(title) || hasContactInfo(description);
}
