// ============================================================
// Auto-generated project titles for owner new-project wizards
// and live auction card display (sentence form, no floor lists).
// ============================================================

import type { BuildingType } from '@/lib/buildingConfig';
import { ASSAM_BUILDING_TYPE } from '@/lib/buildingConfig';
import {
  getMistriActivityCategory,
  isAssamMistriFloor,
  type MistriActivityCategory,
  type MistriCivilWorkType,
  type MistriFloorWork,
  type MistriPlasterSide,
  parseMistriDetails,
} from '@/lib/mistriDetails';
import type { PainterPaintingScope } from '@/lib/painterDetails';
import { getServiceCategoryLabel, getProjectServiceType } from '@/lib/project/display';
import type { ServiceType, TrackType } from '@/lib/types';

export interface GenerateProjectTitleInput {
  serviceType: ServiceType;
  district: string;
  /** Project-level major/minor choice for Mistri posts. */
  activityCategory?: MistriActivityCategory | null;
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

function inferActivityCategoryFromFloorWork(
  floorWork?: MistriFloorWork[] | null,
): MistriActivityCategory | null {
  if (!floorWork?.length) return null;
  for (const fw of floorWork) {
    const cat = getMistriActivityCategory(fw.workTypes);
    if (cat) return cat;
  }
  return null;
}

function inferActivityCategoryFromCivilWork(
  civilWorkTypes?: MistriCivilWorkType[] | null,
): MistriActivityCategory | null {
  if (!civilWorkTypes?.length) return null;
  const major = civilWorkTypes.some(
    (t) => t === 'complete_full_structure' || t === 'foundation_concrete_structure',
  );
  const minor = civilWorkTypes.some(
    (t) =>
      t === 'brickwork_aac' ||
      t === 'plastering' ||
      t === 'tile_marble_flooring' ||
      t === 'boundary_wall_fencing',
  );
  if (major && !minor) return 'major';
  if (minor && !major) return 'minor';
  if (major) return 'major';
  return null;
}

function isAssamMistriTitle(input: GenerateProjectTitleInput): boolean {
  if (input.floorWork?.some((fw) => isAssamMistriFloor(fw.floorId))) return true;
  if (input.buildingTypes?.includes(ASSAM_BUILDING_TYPE)) return true;
  return false;
}

function mistriConstructionPhrase(input: GenerateProjectTitleInput): string | null {
  const isAssam = isAssamMistriTitle(input);
  const category =
    input.activityCategory ??
    inferActivityCategoryFromFloorWork(input.floorWork) ??
    inferActivityCategoryFromCivilWork(input.civilWorkTypes);

  if (isAssam) {
    return 'Assam type House construction';
  }

  if (category === 'minor') {
    return 'RCC minor finishing activities';
  }

  if (category === 'major' || input.floorWork?.length || input.buildingTypes?.length) {
    return 'RCC House construction';
  }

  return null;
}

/**
 * Build auction title: profession + construction type + location (sentence form).
 * Does not include floor-wise work detail.
 */
export function generateProjectTitle(input: GenerateProjectTitleInput): string {
  const district = input.district.trim() || 'Assam';
  const profession = getServiceCategoryLabel(input.serviceType);

  if (input.serviceType === 'labour_contractor') {
    const phrase = mistriConstructionPhrase(input);
    if (phrase) {
      return `${profession} needed for ${phrase} in ${district}`;
    }
    return `${profession} needed in ${district}`;
  }

  const scope = input.scopeLabel?.trim();
  if (scope) {
    return `${profession} needed for ${scope} in ${district}`;
  }

  return `${profession} needed in ${district}`;
}

/**
 * Live auction / public card title — prefers a clean sentence from project data
 * so older posts with floor-wise titles still display cleanly.
 */
export function getLiveAuctionDisplayTitle(project: {
  title?: string | null;
  district?: string | null;
  service_type?: ServiceType | null;
  mistri_details?: unknown;
}): string {
  const serviceType = getProjectServiceType(project);
  const district = (project.district ?? '').trim() || 'Assam';

  if (serviceType === 'labour_contractor') {
    const details = parseMistriDetails(project.mistri_details);
    if (details) {
      return generateProjectTitle({
        serviceType,
        district,
        floorWork: details.floorWork,
        civilWorkTypes: details.civilWorkTypes,
        plasterSide: details.plasterSide,
      });
    }
  }

  const stored = (project.title ?? '').trim();
  if (stored) {
    // Strip legacy floor-wise suffixes after an em dash when present.
    if (serviceType === 'labour_contractor' && stored.includes(' — ')) {
      return generateProjectTitle({ serviceType, district });
    }
    return stored;
  }

  return generateProjectTitle({ serviceType, district });
}
