// ============================================================
// Trade Service Bidding — shared config for the six trades that
// replaced the old "Hire Services" callback flow. Single source
// of truth for labels/emojis used across signup, project posting,
// and provider dashboards.
// ============================================================

import type { ServiceType, TradeServiceType } from './types';

export interface TradeServiceOption {
  value: TradeServiceType;
  label: string;
  emoji: string;
  description: string;
}

export const TRADE_SERVICE_OPTIONS: TradeServiceOption[] = [
  {
    value: 'painter',
    label: 'Painter',
    emoji: '🎨',
    description: 'Interior & exterior painting work',
  },
  {
    value: 'plumber',
    label: 'Plumber',
    emoji: '🔧',
    description: 'Plumbing & pipefitting work',
  },
  {
    value: 'electrician',
    label: 'Electrician',
    emoji: '⚡',
    description: 'Wiring & electrical fittings',
  },
  {
    value: 'carpenter',
    label: 'Carpenter',
    emoji: '🪚',
    description: 'Woodwork, furniture & fittings',
  },
  {
    value: 'false_ceiling_work',
    label: 'False Ceiling Work',
    emoji: '🏠',
    description: 'False ceiling installation',
  },
  {
    value: 'earthwork',
    label: 'Earthwork',
    emoji: '🚜',
    description: 'Excavation & earthwork',
  },
];

export const TRADE_SERVICE_VALUES: TradeServiceType[] = TRADE_SERVICE_OPTIONS.map((o) => o.value);

export function isTradeServiceType(value: string | null | undefined): value is TradeServiceType {
  if (!value) return false;
  return (TRADE_SERVICE_VALUES as string[]).includes(value);
}

export function getTradeOption(value: string | null | undefined): TradeServiceOption | undefined {
  return TRADE_SERVICE_OPTIONS.find((o) => o.value === value);
}

export function getTradeLabel(value: ServiceType | string | null | undefined): string {
  return getTradeOption(value)?.label ?? 'Service Provider';
}

export function getTradeEmoji(value: ServiceType | string | null | undefined): string {
  return getTradeOption(value)?.emoji ?? '🔧';
}

export interface ServiceCategoryOption {
  value: ServiceType;
  label: string;
  emoji: string;
  description: string;
}

/** Every service a client can post a project for / a provider can bid on — powers the
 * homepage category bar and the provider signup grid. */
export const ALL_SERVICE_CATEGORIES: ServiceCategoryOption[] = [
  {
    value: 'labour_contractor',
    label: 'Mistri Contractor',
    emoji: '👷',
    description: 'Labour-only ₹/sqft bidding',
  },
  {
    value: 'construction_firm',
    label: 'Construction Firm',
    emoji: '🏗️',
    description: 'Turnkey ₹/sqft bidding',
  },
  ...TRADE_SERVICE_OPTIONS.map((t) => ({
    value: t.value, label: t.label, emoji: t.emoji, description: t.description,
  })),
];
