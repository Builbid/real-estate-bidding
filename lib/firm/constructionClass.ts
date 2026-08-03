import { FINISHING_LEVEL_CONFIG } from '@/lib/firm/finishingLevel';
import type { FinishingLevel } from '@/lib/types';

export const CONSTRUCTION_CLASS_LEVELS: FinishingLevel[] = ['premium', 'standard', 'basic'];

export function isValidConstructionClass(value: string | null | undefined): value is FinishingLevel {
  return value === 'basic' || value === 'standard' || value === 'premium';
}

export function getConstructionClassLabel(level: FinishingLevel): string {
  return FINISHING_LEVEL_CONFIG[level].classBadge;
}

export function getConstructionClassTitle(level: FinishingLevel): string {
  return `${FINISHING_LEVEL_CONFIG[level].classBadge} — ${FINISHING_LEVEL_CONFIG[level].title}`;
}
