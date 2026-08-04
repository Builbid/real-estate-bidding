import type { BuildingType, ConstructionTypesMap } from '@/lib/buildingConfig';
import { BUILDING_TYPE_OPTIONS } from '@/lib/buildingConfig';
import { normalizeConstructionPackages } from '@/lib/firm/constructionClass';
import type { Bid, FinishingLevel, PackageBidPrice, Project, SubConfiguration, TrackType } from '@/lib/types';

const VALID_BUILDING_TYPES = new Set<string>(BUILDING_TYPE_OPTIONS);
const VALID_FINISHING: FinishingLevel[] = ['basic', 'standard', 'premium'];

function parseJsonObject<T extends Record<string, unknown>>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as T;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeBuildingTypes(raw: unknown): BuildingType[] {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (t): t is BuildingType => typeof t === 'string' && VALID_BUILDING_TYPES.has(t),
  );
}

function normalizeConstructionTypes(raw: unknown): ConstructionTypesMap {
  const obj = parseJsonObject<ConstructionTypesMap>(raw);
  return obj ?? {};
}

function normalizeSubConfiguration(raw: unknown): SubConfiguration {
  const obj = parseJsonObject<Record<string, unknown>>(raw);
  if (!obj) return {};
  return obj as SubConfiguration;
}

function normalizeFinishingLevel(raw: unknown): FinishingLevel | null {
  if (typeof raw !== 'string') return null;
  return VALID_FINISHING.includes(raw as FinishingLevel) ? (raw as FinishingLevel) : null;
}

function toNumber(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizePackageRates(raw: unknown): PackageBidPrice[] | null {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value)) return null;

  const entries = value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const rate = toNumber(item.rate);
      const packages = normalizeConstructionPackages([item.package]);
      const pkg = packages?.[0];
      if (rate == null || rate <= 0 || !pkg) return null;
      return { rate, package: pkg };
    })
    .filter((entry): entry is PackageBidPrice => entry != null);

  return entries.length > 0 ? entries : null;
}

/** Normalize raw Supabase project row for safe client rendering. */
export function sanitizeFirmProject(raw: Record<string, unknown>): Project {
  const buildingTypes = normalizeBuildingTypes(raw.building_types);
  const trackType = (raw.track_type === 'AssamType' ? 'AssamType' : 'RCC') as TrackType;

  return {
    id: String(raw.id ?? ''),
    owner_id: String(raw.owner_id ?? ''),
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Untitled Project',
    description: typeof raw.description === 'string' ? raw.description : null,
    track_type: trackType,
    sub_configuration: normalizeSubConfiguration(raw.sub_configuration),
    building_types: buildingTypes,
    construction_types: normalizeConstructionTypes(raw.construction_types),
    district: typeof raw.district === 'string' && raw.district.trim()
      ? raw.district
      : 'Location not specified',
    state: typeof raw.state === 'string' ? raw.state : 'Assam',
    plot_area_sqft: toNumber(raw.plot_area_sqft),
    total_floors: (raw.total_floors === 2 || raw.total_floors === 3 ? raw.total_floors : 1) as 1 | 2 | 3,
    status: (raw.status as Project['status']) ?? 'active_24h',
    bidding_ends_at: typeof raw.bidding_ends_at === 'string' ? raw.bidding_ends_at : new Date().toISOString(),
    selection_ends_at: typeof raw.selection_ends_at === 'string' ? raw.selection_ends_at : null,
    selected_builder_id: typeof raw.selected_builder_id === 'string' ? raw.selected_builder_id : null,
    service_type: raw.service_type === 'construction_firm' ? 'construction_firm' : 'labour_contractor',
    floor_area_sqft: toNumber(raw.floor_area_sqft),
    finishing_level: normalizeFinishingLevel(raw.finishing_level),
    budget_range_min: toNumber(raw.budget_range_min),
    budget_range_max: toNumber(raw.budget_range_max),
    drawing_url: typeof raw.drawing_url === 'string' ? raw.drawing_url : null,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : new Date().toISOString(),
  };
}

/** Normalize bid row — never throw on missing rate fields. */
export function sanitizeFirmBid(raw: Record<string, unknown> | null): Bid | null {
  if (!raw?.id) return null;

  const ratesRaw = parseJsonObject<Record<string, unknown>>(raw.rates) ?? {};
  const singleRate = toNumber(raw.single_rate);
  const totalMetric = toNumber(raw.total_sum_metric);
  const groundRate = toNumber(ratesRaw.ground_rate);

  return {
    id: String(raw.id),
    project_id: String(raw.project_id ?? ''),
    builder_id: typeof raw.builder_id === 'string' ? raw.builder_id : null,
    rates: {
      ground_rate: groundRate ?? singleRate ?? 0,
      first_rate: toNumber(ratesRaw.first_rate) ?? undefined,
      second_rate: toNumber(ratesRaw.second_rate) ?? undefined,
    },
    total_sum_metric: totalMetric ?? singleRate ?? groundRate ?? 0,
    single_rate: singleRate,
    package_rates: normalizePackageRates(raw.package_rates),
    service_type: raw.service_type === 'construction_firm' ? 'construction_firm' : 'labour_contractor',
    is_withdrawn: Boolean(raw.is_withdrawn),
    created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : new Date().toISOString(),
  };
}
