import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  getCarpenterScopeLabel,
  parseTradeDetails,
  type CarpenterScopeType,
} from '@/lib/tradeWorkDetails';
import { isLegacyCarpenterService } from '@/lib/trades';
import type { ServiceType } from '@/lib/types';
import { normalizeServiceType } from '@/lib/validation/bidRates';
import { readProjectInteriorBidOptions } from '@/lib/interiorBid';
import {
  isPlumbingPointRateProject,
  readPlumbingPointRateFloors,
  readProjectPlumbingBidOptions,
} from '@/lib/plumberBid';
import {
  isElectricianPointRateProject,
  readElectricianPointRateFloors,
  readProjectElectricianBidOptions,
} from '@/lib/electricianBid';

export const MODULAR_KITCHEN_BID_LABEL = 'Modular Kitchen';

export interface ScopeRateBidItems {
  labels: string[];
  count: number;
  kind: 'scope' | 'floors' | 'assam-addons' | 'plumbing' | 'electrician' | 'interior';
  flexibleRates: boolean;
  unitSuffix?: string;
  /** Per-item unit suffix aligned with labels (e.g. plumbing package vs ₹/Rft). */
  rateUnits?: string[];
  optionIds?: string[];
  unitRateBid?: boolean;
  /** Plumber/electrician fixture-point bids: per-floor rate per point, ranked by estimated fixture total. */
  pointRateBid?: boolean;
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

  if (service === 'plumber' || tradeDetails?.service === 'plumber') {
    if (isPlumbingPointRateProject(readNestedProjectDetail(project, 'trade_details'))) {
      const floors = readPlumbingPointRateFloors(project);
      if (floors.length > 0) {
        return {
          labels: floors.map((floor) => `${floor.label} — Rate Per Point`),
          count: floors.length,
          kind: 'plumbing',
          flexibleRates: false,
          unitSuffix: '/point',
          rateUnits: floors.map(() => '/point'),
          optionIds: floors.map((floor) => `point:${floor.floor}`),
          unitRateBid: false,
          pointRateBid: true,
        };
      }
    }
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

  if (service === 'electrician' || tradeDetails?.service === 'electrician') {
    if (isElectricianPointRateProject(readNestedProjectDetail(project, 'trade_details'))) {
      const floors = readElectricianPointRateFloors(project);
      if (floors.length > 0) {
        return {
          labels: floors.map((floor) => `${floor.label} — Rate Per Point`),
          count: floors.length,
          kind: 'electrician',
          flexibleRates: false,
          unitSuffix: '/point',
          rateUnits: floors.map(() => '/point'),
          optionIds: floors.map((floor) => `point:${floor.floor}`),
          unitRateBid: false,
          pointRateBid: true,
        };
      }
    }
    const options = readProjectElectricianBidOptions(project);
    if (options.length > 0) {
      return {
        labels: options.map((option) => option.label),
        count: options.length,
        kind: 'electrician',
        flexibleRates: false,
        unitSuffix: '/unit',
        rateUnits: options.map((option) => option.unitSuffix),
        optionIds: options.map((option) => option.id),
        unitRateBid: true,
      };
    }
  }

  if (service === 'false_ceiling_work' || tradeDetails?.service === 'false_ceiling_work') {
    const interiorOptions = readProjectInteriorBidOptions(project);
    if (interiorOptions.length > 0) {
      return {
        labels: interiorOptions.map((option) => option.label),
        count: interiorOptions.length,
        kind: 'interior',
        flexibleRates: false,
        unitSuffix: '/unit',
        rateUnits: interiorOptions.map((option) => option.unitSuffix),
        optionIds: interiorOptions.map((option) => option.id),
        unitRateBid: true,
      };
    }
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

  if (service === 'labour_contractor' || bidder === 'labour_contractor') {
    // Mistri / Civil bids are ranked on total floor-wise slab-area civil cost,
    // not Assam add-on averages or Chowkhat extra rate keys.
    return null;
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
