import { resolveProjectBidFloors } from '@/lib/bid/floorRateDisplay';
import {
  ASSAM_CIVIL_BID_LABEL,
  ASSAM_ROOF_BID_LABEL,
  MISTRI_CHOWKHAT_LABEL,
  getAssamMistriBidLabels,
  hasAssamMistriFloorWork,
  hasMistriChowkhat,
  parseMistriDetails,
} from '@/lib/mistriDetails';
import { ASSAM_BUILDING_TYPE } from '@/lib/buildingConfig';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  getCarpenterScopeLabel,
  parseTradeDetails,
  type CarpenterScopeType,
} from '@/lib/tradeWorkDetails';
import { isLegacyCarpenterService } from '@/lib/trades';
import type { ServiceType, SubConfiguration } from '@/lib/types';
import { normalizeServiceType } from '@/lib/validation/bidRates';
import { readProjectPlumbingBidOptions } from '@/lib/plumberBid';

export const MODULAR_KITCHEN_BID_LABEL = 'Modular Kitchen';

export interface ScopeRateBidItems {
  labels: string[];
  count: number;
  kind: 'scope' | 'floors' | 'assam-addons' | 'plumbing';
  flexibleRates: boolean;
  unitSuffix?: string;
  /** Per-item unit suffix aligned with labels (e.g. plumbing package vs ₹/Rft). */
  rateUnits?: string[];
  optionIds?: string[];
  unitRateBid?: boolean;
}

const LEGACY_CARPENTER_SCOPE_ORDER: CarpenterScopeType[] = [
  'door_window_frames',
  'modular_kitchen',
];

function readLegacyCarpenterScopes(raw: unknown): CarpenterScopeType[] {
  const details = parseTradeDetails(raw);
  if (details?.service === 'carpenter' && details.scopeTypes.length > 0) {
    return details.scopeTypes.filter(
      (value): value is 'door_window_frames' | 'modular_kitchen' =>
        value === 'door_window_frames' || value === 'modular_kitchen',
    );
  }
  return [];
}

function hasInteriorModularKitchen(raw: unknown): boolean {
  const details = parseTradeDetails(raw);
  return details?.service === 'false_ceiling_work' && details.scopeType === 'modular_kitchen';
}

function isAssamTypeProject(project: {
  track_type?: string | null;
  building_types?: string[] | null;
}): boolean {
  return (
    project.track_type === 'AssamType' ||
    (project.building_types?.includes(ASSAM_BUILDING_TYPE) ?? false)
  );
}

/**
 * Extra /sqft rate inputs beyond the default single-package or per-floor layout:
 * - Assam Type Mistri: Civil + Roof / Tile / Chowkhat add-ons
 * - RCC Mistri Worker + Chowkhat
 * - Interior Work + Modular Kitchen
 * - Legacy Carpenter projects
 * - Plumber: bathroom package + multi-option CPVC / SWR piping (₹ / Running Foot)
 */
export function resolveScopeRateBidItems(
  project: {
    service_type?: ServiceType | string | null;
    trade_details?: unknown;
    mistri_details?: unknown;
    sub_configuration?: unknown;
    track_type?: string | null;
    building_types?: string[] | null;
    total_floors?: number | null;
  },
  bidderServiceType?: string | null,
): ScopeRateBidItems | null {
  const service = normalizeServiceType(project.service_type);
  const bidder = normalizeServiceType(bidderServiceType);
  const tradeDetails = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  const mistriDetails = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));

  if (service === 'plumber' || tradeDetails?.service === 'plumber') {
    const options = readProjectPlumbingBidOptions(project);
    if (options.length > 0) {
      const unitRateBid = options.every((option) => option.unit === 'per_unit');
      return {
        labels: options.map((option) => option.label),
        count: options.length,
        kind: 'plumbing',
        flexibleRates: false,
        unitSuffix: unitRateBid ? '/unit' : '/Rft',
        rateUnits: options.map((option) => option.unitSuffix),
        optionIds: options.map((option) => option.id),
        unitRateBid,
      };
    }
  }

  if (
    isLegacyCarpenterService(service) ||
    isLegacyCarpenterService(bidder) ||
    tradeDetails?.service === 'carpenter'
  ) {
    const selected = readLegacyCarpenterScopes(readNestedProjectDetail(project, 'trade_details'));
    const ordered = [
      ...LEGACY_CARPENTER_SCOPE_ORDER.filter((value) => selected.includes(value)),
      ...selected.filter((value) => !LEGACY_CARPENTER_SCOPE_ORDER.includes(value)),
    ].slice(0, 4);
    const scopes = ordered.length > 0 ? ordered : LEGACY_CARPENTER_SCOPE_ORDER;
    return {
      labels: scopes.map((value) => getCarpenterScopeLabel(value)),
      count: scopes.length,
      kind: 'scope',
      flexibleRates: true,
    };
  }

  if (service === 'false_ceiling_work' || tradeDetails?.service === 'false_ceiling_work') {
    if (hasInteriorModularKitchen(readNestedProjectDetail(project, 'trade_details'))) {
      return {
        labels: [MODULAR_KITCHEN_BID_LABEL],
        count: 1,
        kind: 'scope',
        flexibleRates: true,
      };
    }
    return null;
  }

  if (service === 'labour_contractor' || bidder === 'labour_contractor') {
    if (hasAssamMistriFloorWork(mistriDetails) || isAssamTypeProject(project)) {
      const labels = mistriDetails
        ? getAssamMistriBidLabels(mistriDetails)
        : [ASSAM_CIVIL_BID_LABEL, ASSAM_ROOF_BID_LABEL];
      return {
        labels,
        count: labels.length,
        kind: 'assam-addons',
        flexibleRates: true,
      };
    }

    if (!hasMistriChowkhat(mistriDetails)) return null;
    const floors = resolveProjectBidFloors({
      track_type: (project.track_type as 'RCC' | 'AssamType') ?? 'RCC',
      total_floors: project.total_floors,
      sub_configuration: project.sub_configuration as SubConfiguration | null | undefined,
      building_types: project.building_types,
      mistri_details: project.mistri_details,
    });
    const floorLabels = floors.labels.slice(0, 3);
    const labels =
      floorLabels.length > 0 ? [...floorLabels, MISTRI_CHOWKHAT_LABEL] : [MISTRI_CHOWKHAT_LABEL];
    return {
      labels,
      count: labels.length,
      kind: floorLabels.length > 0 ? 'floors' : 'scope',
      flexibleRates: true,
    };
  }

  return null;
}

/** @deprecated Use resolveScopeRateBidItems. Kept for existing carpenter bid displays. */
export function resolveCarpenterBidScopes(
  project: {
    service_type?: ServiceType | string | null;
    trade_details?: unknown;
    sub_configuration?: unknown;
    mistri_details?: unknown;
    track_type?: string | null;
    building_types?: string[] | null;
    total_floors?: number | null;
  },
  bidderServiceType?: string | null,
): ScopeRateBidItems | null {
  return resolveScopeRateBidItems(project, bidderServiceType);
}
