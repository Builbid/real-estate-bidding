import { resolveProjectBidFloors } from '@/lib/bid/floorRateDisplay';
import {
  MISTRI_CHOWKHAT_LABEL,
  hasMistriChowkhat,
  parseMistriDetails,
} from '@/lib/mistriDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  getCarpenterScopeLabel,
  parseTradeDetails,
  type CarpenterScopeType,
} from '@/lib/tradeWorkDetails';
import { isLegacyCarpenterService } from '@/lib/trades';
import type { ServiceType, SubConfiguration } from '@/lib/types';
import { normalizeServiceType } from '@/lib/validation/bidRates';

export const MODULAR_KITCHEN_BID_LABEL = 'Modular Kitchen';

export interface ScopeRateBidItems {
  labels: string[];
  count: number;
  kind: 'scope' | 'floors';
  flexibleRates: boolean;
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

/**
 * Extra /sqft rate inputs beyond the default single-package or per-floor layout:
 * - Mistri Worker + Chowkhat
 * - Interior Work + Modular Kitchen
 * - Legacy Carpenter projects
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

  if (
    isLegacyCarpenterService(service) ||
    isLegacyCarpenterService(bidder) ||
    tradeDetails?.service === 'carpenter'
  ) {
    const selected = readLegacyCarpenterScopes(readNestedProjectDetail(project, 'trade_details'));
    const ordered = [
      ...LEGACY_CARPENTER_SCOPE_ORDER.filter((value) => selected.includes(value)),
      ...selected.filter((value) => !LEGACY_CARPENTER_SCOPE_ORDER.includes(value)),
    ].slice(0, 3);
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
    if (!hasMistriChowkhat(mistriDetails)) return null;
    const floors = resolveProjectBidFloors({
      track_type: (project.track_type as 'RCC' | 'AssamType') ?? 'RCC',
      total_floors: project.total_floors,
      sub_configuration: project.sub_configuration as SubConfiguration | null | undefined,
      building_types: project.building_types,
      mistri_details: project.mistri_details,
    });
    const floorLabels = floors.labels.slice(0, 2);
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
