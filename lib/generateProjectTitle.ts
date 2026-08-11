// ============================================================
// Auto-generated project titles for owner new-project wizards
// Format: `${categoryName} Requirement in ${district}`
// ============================================================

import type { BuildingType } from '@/lib/buildingConfig';
import type { MistriCivilWorkType } from '@/lib/mistriDetails';
import type { PainterPaintingScope } from '@/lib/painterDetails';
import { getServiceCategoryLabel } from '@/lib/project/display';
import type { ServiceType, TrackType } from '@/lib/types';

export interface GenerateProjectTitleInput {
  serviceType: ServiceType;
  district: string;
  /** Kept for call-site compatibility; not used in the canonical title format. */
  paintingScope?: PainterPaintingScope | null;
  trackType?: TrackType | null;
  civilWorkTypes?: MistriCivilWorkType[];
  buildingTypes?: BuildingType[];
}

/**
 * Build auction title from service category + district.
 * Owners no longer enter title manually.
 * Format: `${categoryName} Requirement in ${district}`
 */
export function generateProjectTitle(input: GenerateProjectTitleInput): string {
  const district = input.district.trim() || 'Assam';
  const categoryName = getServiceCategoryLabel(input.serviceType);
  return `${categoryName} Requirement in ${district}`;
}
