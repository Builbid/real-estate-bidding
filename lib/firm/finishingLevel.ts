import type { FinishingLevel } from '@/lib/types';

export const FINISHING_LEVEL_CONFIG: Record<
  FinishingLevel,
  {
    icon: string;
    title: string;
    classBadge: string;
    accent: 'slate' | 'blue' | 'amber';
    includes: string[];
    bestFor: string;
    popular?: boolean;
  }
> = {
  basic: {
    icon: '🏠',
    title: 'Basic Finishing',
    classBadge: 'C Class',
    accent: 'slate',
    includes: [
      'Standard cement flooring or basic tiles',
      'Simple wall putty & paint (one coat)',
      'Basic electrical & plumbing fittings',
      'Standard doors & windows (local grade)',
      'No false ceiling or decorative work',
    ],
    bestFor: 'Budget-conscious builds',
  },
  standard: {
    icon: '🏡',
    title: 'Standard Finishing',
    classBadge: 'B Class',
    accent: 'blue',
    popular: true,
    includes: [
      'Vitrified tile flooring',
      'Wall putty + 2 coat premium paint',
      'Branded electrical & plumbing fittings',
      'Teak or flush doors, UPVC windows',
      'Basic false ceiling in living area',
    ],
    bestFor: 'Comfortable family homes',
  },
  premium: {
    icon: '🏰',
    title: 'Premium Finishing',
    classBadge: 'A Class',
    accent: 'amber',
    includes: [
      'Imported marble or premium tile flooring',
      'Texture paint / wallpaper options',
      'Premium branded fittings (Jaquar, Havells etc.)',
      'Hardwood doors, aluminium/UPVC windows',
      'Full false ceiling with lighting design',
      'Modular kitchen & wardrobes',
    ],
    bestFor: 'Luxury dream homes',
  },
};

export function getFinishingClassBadge(level: FinishingLevel): string {
  return FINISHING_LEVEL_CONFIG[level].classBadge;
}

export function getFinishingTitle(level: FinishingLevel): string {
  return FINISHING_LEVEL_CONFIG[level].title;
}
