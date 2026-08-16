import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  CARPENTER_SCOPE_OPTIONS,
  getCarpenterScopeLabel,
  parseTradeDetails,
  type CarpenterScopeType,
} from '@/lib/tradeWorkDetails';
import type { ServiceType } from '@/lib/types';

export interface CarpenterBidScopes {
  labels: string[];
  count: number;
  scopes: CarpenterScopeType[];
}

const SCOPE_ORDER = CARPENTER_SCOPE_OPTIONS.map((option) => option.value);

/** Selected carpenter scopes in catalog order, mapped to rate input labels. */
export function resolveCarpenterBidScopes(project: {
  service_type?: ServiceType | string | null;
  trade_details?: unknown;
  sub_configuration?: unknown;
}): CarpenterBidScopes | null {
  if (project.service_type !== 'carpenter') return null;

  const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  if (!details || details.service !== 'carpenter') {
    return { labels: ['Your'], count: 1, scopes: [] };
  }

  const selected = new Set(details.scopeTypes);
  const ordered = [
    ...SCOPE_ORDER.filter((value) => selected.has(value)),
    ...details.scopeTypes.filter((value) => !SCOPE_ORDER.includes(value)),
  ].slice(0, 3);

  if (ordered.length === 0) {
    return { labels: ['Your'], count: 1, scopes: [] };
  }

  return {
    scopes: ordered,
    labels: ordered.map((value) => getCarpenterScopeLabel(value)),
    count: ordered.length,
  };
}
