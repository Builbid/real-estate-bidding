import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig';
import { CONSTRUCTION_TYPE_FULL } from '@/lib/buildingConfig';

/** Firm projects default every selected floor to full finishing for legacy bid mapping. */
export function buildFirmConstructionTypes(buildingTypes: BuildingType[]): ConstructionTypesMap {
  const map: ConstructionTypesMap = {};
  buildingTypes.forEach((t) => {
    map[t] = CONSTRUCTION_TYPE_FULL;
  });
  return map;
}
