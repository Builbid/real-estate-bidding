import { FINISHING_LEVEL_CONFIG } from '@/lib/firm/finishingLevel';
import type { FinishingLevel, FirmConstructionClassPackages } from '@/lib/types';

export const CONSTRUCTION_CLASS_LEVELS: FinishingLevel[] = ['premium', 'standard', 'basic'];

export const MIN_PACKAGE_DESCRIPTION_LENGTH = 25;

export function getConstructionClassLabel(level: FinishingLevel): string {
  return FINISHING_LEVEL_CONFIG[level].classBadge;
}

export function getConstructionClassTitle(level: FinishingLevel): string {
  return `${FINISHING_LEVEL_CONFIG[level].classBadge} — ${FINISHING_LEVEL_CONFIG[level].title}`;
}

export function emptyConstructionClassPackages(): FirmConstructionClassPackages {
  return { premium: '', standard: '', basic: '' };
}

export function parseConstructionClassPackagesFromForm(
  formData: FormData,
): FirmConstructionClassPackages {
  return {
    premium: (formData.get('construction_class_premium') as string | null)?.trim() ?? '',
    standard: (formData.get('construction_class_standard') as string | null)?.trim() ?? '',
    basic: (formData.get('construction_class_basic') as string | null)?.trim() ?? '',
  };
}

export function validateConstructionClassPackages(
  packages: FirmConstructionClassPackages,
): string | null {
  for (const level of CONSTRUCTION_CLASS_LEVELS) {
    const text = packages[level]?.trim() ?? '';
    if (text.length < MIN_PACKAGE_DESCRIPTION_LENGTH) {
      return `Describe what your ${getConstructionClassLabel(level)} package includes (at least ${MIN_PACKAGE_DESCRIPTION_LENGTH} characters).`;
    }
  }
  return null;
}

export function hasCompleteConstructionClassPackages(
  packages: FirmConstructionClassPackages,
): boolean {
  return validateConstructionClassPackages(packages) === null;
}

export function normalizeConstructionClassPackages(
  raw: unknown,
): FirmConstructionClassPackages | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const premium = typeof record.premium === 'string' ? record.premium.trim() : '';
  const standard = typeof record.standard === 'string' ? record.standard.trim() : '';
  const basic = typeof record.basic === 'string' ? record.basic.trim() : '';

  if (!premium && !standard && !basic) return null;

  return { premium, standard, basic };
}

export function getPackageDescriptionHint(level: FinishingLevel): string {
  const examples = FINISHING_LEVEL_CONFIG[level].includes;
  return `e.g. ${examples.slice(0, 3).join('; ')}`;
}
