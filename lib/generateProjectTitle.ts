// ============================================================
// Auto-generated project titles for owner new-project wizards
// Format: [Service / Main Detail] … in [District]
// ============================================================

import { formatBuildingTypesSummary, type BuildingType } from '@/lib/buildingConfig';
import {
  MISTRI_CIVIL_WORK_OPTIONS,
  type MistriCivilWorkType,
} from '@/lib/mistriDetails';
import {
  PAINTER_SCOPE_OPTIONS,
  type PainterPaintingScope,
} from '@/lib/painterDetails';
import { getTradeLabel } from '@/lib/trades';
import type { ServiceType, TrackType } from '@/lib/types';

const TRACK_TITLE_LABEL: Record<TrackType, string> = {
  RCC: 'RCC',
  AssamType: 'Assam Type',
};

/** Short display names for mistri title fragments (avoid long option labels). */
const MISTRI_TITLE_SHORT: Record<MistriCivilWorkType, string> = {
  brickwork_aac: 'Brickwork',
  plastering: 'Plastering',
  foundation_concrete_structure: 'Concrete',
  tile_marble_flooring: 'Flooring',
  boundary_wall_fencing: 'Boundary Wall',
  complete_full_structure: 'Full Structure',
};

function painterScopeTitle(scope: PainterPaintingScope | null | undefined): string {
  if (!scope) return 'Painting';
  if (scope === 'both') return 'Interior & Exterior';
  return PAINTER_SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? 'Painting';
}

function mistriWorkTitle(types: MistriCivilWorkType[] | undefined): string {
  if (!types || types.length === 0) return 'Civil';

  if (types.includes('complete_full_structure')) {
    return 'Full Structure';
  }

  const shorts = types
    .map((t) => MISTRI_TITLE_SHORT[t] ?? MISTRI_CIVIL_WORK_OPTIONS.find((o) => o.value === t)?.label)
    .filter(Boolean) as string[];

  if (shorts.length === 0) return 'Civil';
  if (shorts.length === 1) return shorts[0];
  if (shorts.length === 2) return `${shorts[0]} & ${shorts[1]}`;
  return `${shorts[0]} & ${shorts[1]}`;
}

export interface GenerateProjectTitleInput {
  serviceType: ServiceType;
  district: string;
  /** Painter scope (interior / exterior / both). */
  paintingScope?: PainterPaintingScope | null;
  /** Trade building track (RCC / Assam Type). */
  trackType?: TrackType | null;
  /** Mistri civil work multi-select. */
  civilWorkTypes?: MistriCivilWorkType[];
  /** Firm / drawing house floors. */
  buildingTypes?: BuildingType[];
}

/**
 * Build a clean auction title from service context + district.
 * Called on submit — owners no longer enter title manually.
 */
export function generateProjectTitle(input: GenerateProjectTitleInput): string {
  const district = input.district.trim() || 'Assam';

  switch (input.serviceType) {
    case 'painter': {
      const scope = painterScopeTitle(input.paintingScope);
      return `Painter for ${scope} Work in ${district}`;
    }
    case 'labour_contractor': {
      const work = mistriWorkTitle(input.civilWorkTypes);
      return `${work} Work in ${district}`;
    }
    case 'electrician':
    case 'plumber':
    case 'carpenter':
    case 'false_ceiling_work':
    case 'earthwork': {
      const label = getTradeLabel(input.serviceType);
      const property =
        input.trackType != null ? TRACK_TITLE_LABEL[input.trackType] : null;
      if (property) {
        return `${label} Work for ${property} in ${district}`;
      }
      return `${label} Work in ${district}`;
    }
    case 'construction_firm': {
      const building =
        formatBuildingTypesSummary(input.buildingTypes ?? []) || 'Construction';
      return `${building} Work in ${district}`;
    }
    case 'drawing_design': {
      const house =
        formatBuildingTypesSummary(input.buildingTypes ?? []) || 'House';
      return `Drawing & Design for ${house} in ${district}`;
    }
    default: {
      const fallback = getTradeLabel(input.serviceType);
      return `${fallback} Work in ${district}`;
    }
  }
}
