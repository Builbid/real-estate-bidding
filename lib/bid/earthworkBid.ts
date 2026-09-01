import { parseTradeDetails } from '@/lib/tradeWorkDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import type { BidRates, BidUnit, ServiceType } from '@/lib/types';

export type EarthworkBidMode = 'hourly' | 'trip';
export type BidDisplayUnit = 'hour' | 'trip' | 'sqft' | 'flat' | 'point' | 'rft';

export function isFlatRupeeService(serviceType?: ServiceType | null): boolean {
  return serviceType === 'plumber';
}

export function isPerPointService(serviceType?: ServiceType | null): boolean {
  return serviceType === 'electrician';
}

export { allowsAnyWholeNumberRate } from '@/lib/validation/bidRates';

export function resolveEarthworkBidMode(project: {
  service_type?: ServiceType | null;
  trade_details?: unknown;
  sub_configuration?: unknown;
}): EarthworkBidMode | null {
  if (project.service_type !== 'earthwork') return null;
  const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  if (!details || details.service !== 'earthwork') return null;
  if (details.workType === 'foundation_excavation') return 'hourly';
  if (details.workType === 'soil_filling') return 'trip';
  return null;
}

export function bidUnitForEarthworkMode(mode: EarthworkBidMode | null): BidUnit {
  if (mode === 'hourly') return 'per_hour';
  if (mode === 'trip') return 'per_trip';
  return 'per_sqft';
}

export function getBidDisplayUnit(
  rates?: Partial<BidRates> | null,
  mode?: EarthworkBidMode | null,
  serviceType?: ServiceType | null,
): BidDisplayUnit {
  const unit = rates?.bid_unit ?? bidUnitForEarthworkMode(mode ?? null);
  if (unit === 'per_hour') return 'hour';
  if (unit === 'per_trip') return 'trip';
  if (unit === 'per_running_foot') return 'rft';
  if (unit === 'flat' || isFlatRupeeService(serviceType)) return 'flat';
  if (unit === 'per_point' || isPerPointService(serviceType)) return 'point';
  return 'sqft';
}

export function formatBidUnitSuffix(
  rates?: Partial<BidRates> | null,
  mode?: EarthworkBidMode | null,
  serviceType?: ServiceType | null,
): string {
  if (rates?.total_civil_cost != null && rates.total_civil_cost > 0) return '';
  const unit = getBidDisplayUnit(rates, mode, serviceType);
  if (unit === 'flat') return '';
  if (unit === 'rft') return '/Rft';
  return unit === 'sqft' ? '/sqft' : `/${unit}`;
}

/** Small caption under a bid amount — "Rs." for plumber, "/sqft" otherwise. */
export function formatBidUnitCaption(
  rates?: Partial<BidRates> | null,
  mode?: EarthworkBidMode | null,
  serviceType?: ServiceType | null,
): string {
  if (rates?.total_civil_cost != null && rates.total_civil_cost > 0) return 'total civil';
  const unit = getBidDisplayUnit(rates, mode, serviceType);
  if (unit === 'flat') return 'Rs.';
  if (unit === 'hour') return '/hour';
  if (unit === 'trip') return '/trip';
  if (unit === 'point') return '/point';
  if (unit === 'rft') return '/Rft avg';
  return '/sqft';
}

export function sanitizeCapacityInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`;
}

export function parseVehicleCapacity(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

export function getVehicleCapacityError(raw: string): string | null {
  if (!raw.trim()) return 'Enter the vehicle trip capacity in cu.m.';
  const value = parseVehicleCapacity(raw);
  if (value == null) return 'Enter a valid capacity greater than zero.';
  return null;
}

export function formatTripCapacityLabel(capacity: number | null | undefined): string | null {
  if (capacity == null || !Number.isFinite(capacity) || capacity <= 0) return null;
  const label = Number.isInteger(capacity) ? String(capacity) : String(capacity);
  return `Capacity: ${label} cum`;
}
