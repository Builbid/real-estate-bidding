import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  CARPENTER_SCOPE_OPTIONS,
  getCarpenterScopeLabel,
  parseTradeDetails,
  type CarpenterScopeType,
} from '@/lib/tradeWorkDetails';
import { normalizeServiceType } from '@/lib/validation/bidRates';
import type { ServiceType } from '@/lib/types';

export interface CarpenterBidScopes {
  labels: string[];
  count: number;
  scopes: CarpenterScopeType[];
}

const SCOPE_ORDER = CARPENTER_SCOPE_OPTIONS.map((option) => option.value);
const SCOPE_VALUE_SET = new Set<string>(SCOPE_ORDER);

function isCarpenterService(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => normalizeServiceType(value) === 'carpenter');
}

function asCarpenterScope(value: unknown): CarpenterScopeType | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase().replace(/[\s-]+/g, '_');
  if (SCOPE_VALUE_SET.has(normalized)) return normalized as CarpenterScopeType;

  const lower = trimmed.toLowerCase();
  if (lower.includes('chowkhat') || (lower.includes('door') && lower.includes('window'))) {
    return 'door_window_frames';
  }
  if (lower.includes('modular') || lower.includes('kitchen')) return 'modular_kitchen';
  return null;
}

function readScopeList(raw: unknown): CarpenterScopeType[] {
  const details = parseTradeDetails(raw);
  if (details?.service === 'carpenter' && details.scopeTypes.length > 0) {
    return details.scopeTypes;
  }

  if (!raw || typeof raw !== 'object') return [];
  const record = raw as Record<string, unknown>;
  const collected: CarpenterScopeType[] = [];
  const add = (value: unknown) => {
    const scope = asCarpenterScope(value);
    if (scope && !collected.includes(scope)) collected.push(scope);
  };

  if (Array.isArray(record.scopeTypes)) record.scopeTypes.forEach(add);
  add(record.scopeType);
  return collected;
}

/** Selected carpenter scopes in catalog order, mapped to rate input labels. */
export function resolveCarpenterBidScopes(project: {
  service_type?: ServiceType | string | null;
  trade_details?: unknown;
  sub_configuration?: unknown;
}, bidderServiceType?: string | null): CarpenterBidScopes | null {
  const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  if (!isCarpenterService(project.service_type, details?.service, bidderServiceType)) {
    return null;
  }

  const selected = readScopeList(readNestedProjectDetail(project, 'trade_details'));
  const ordered = [
    ...SCOPE_ORDER.filter((value) => selected.includes(value)),
    ...selected.filter((value) => !SCOPE_ORDER.includes(value)),
  ].slice(0, 3);

  if (ordered.length === 0) {
    return {
      scopes: ['door_window_frames', 'modular_kitchen'],
      labels: [
        getCarpenterScopeLabel('door_window_frames'),
        getCarpenterScopeLabel('modular_kitchen'),
      ],
      count: 2,
    };
  }

  return {
    scopes: ordered,
    labels: ordered.map((value) => getCarpenterScopeLabel(value)),
    count: ordered.length,
  };
}
