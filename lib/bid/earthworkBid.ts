import { parseTradeDetails } from '@/lib/tradeWorkDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import type { BidRates, ServiceType } from '@/lib/types';

export type EarthworkBidMode = 'hourly' | 'trip';
export type BidUnit = 'per_sqft' | 'per_hour' | 'per_trip';

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
): 'hour' | 'trip' | 'sqft' {
  const unit = rates?.bid_unit ?? bidUnitForEarthworkMode(mode ?? null);
  if (unit === 'per_hour') return 'hour';
  if (unit === 'per_trip') return 'trip';
  return 'sqft';
}

export function formatBidUnitSuffix(
  rates?: Partial<BidRates> | null,
  mode?: EarthworkBidMode | null,
): string {
  const unit = getBidDisplayUnit(rates, mode);
  return unit === 'sqft' ? '/sqft' : `/${unit}`;
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
