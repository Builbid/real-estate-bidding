// ============================================================
// Auto-generated project titles for owner new-project wizards
// Format: `${categoryName} Requirement in ${district}`
// Labour: includes cohesive civil-work scope when provided
// ============================================================

import type { BuildingType } from '@/lib/buildingConfig';
import {
  summarizeMistriCivilWorkScope,
  summarizeMistriFloorWorkScope,
  type MistriCivilWorkType,
  type MistriFloorWork,
  type MistriPlasterSide,
} from '@/lib/mistriDetails';
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
  plasterSide?: MistriPlasterSide | null;
  floorWork?: MistriFloorWork[] | null;
  buildingTypes?: BuildingType[];
  /** Optional scope phrase for trade / drawing packages. */
  scopeLabel?: string | null;
}

/**
 * Build auction title from service category + district.
 * Owners no longer enter title manually.
 * Labour contractor titles incorporate a normalized civil-work scope when present.
 */
export function generateProjectTitle(input: GenerateProjectTitleInput): string {
  const district = input.district.trim() || 'Assam';
  const categoryName = getServiceCategoryLabel(input.serviceType);

  if (input.serviceType === 'labour_contractor') {
    if (input.floorWork && input.floorWork.length > 0) {
      const scope = summarizeMistriFloorWorkScope(input.floorWork);
      if (scope) {
        return `${categoryName} — ${scope} in ${district}`;
      }
    }
    if (input.civilWorkTypes && input.civilWorkTypes.length > 0) {
      const scope = summarizeMistriCivilWorkScope(
        input.civilWorkTypes,
        input.plasterSide,
      );
      if (scope) {
        return `${categoryName} — ${scope} in ${district}`;
      }
    }
  }

  const scope = input.scopeLabel?.trim();
  if (scope) {
    return `${categoryName} — ${scope} in ${district}`;
  }

  return `${categoryName} Requirement in ${district}`;
}
