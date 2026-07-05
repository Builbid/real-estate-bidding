export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score >= 3 && password.length >= 10) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
}

export const PASSWORD_STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: 'Weak',
  medium: 'Medium',
  strong: 'Strong',
};

export const PASSWORD_STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak: 'bg-red-500',
  medium: 'bg-amber-500',
  strong: 'bg-emerald-500',
};
