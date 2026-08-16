// ============================================================
// Trade Service Bidding — shared config for the six trades that
// replaced the old "Hire Services" callback flow. Single source
// of truth for labels/emojis used across signup, project posting,
// and provider dashboards.
// ============================================================

import type { ProviderSpecialtyType, ServiceType, TradeServiceType } from './types';
import { isDrawingDesignServiceType } from './drawingDesign';
import { isConstructionFirmEnabled } from './features';

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
    emoji: '🚰',
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
    label: 'Interior Work',
    emoji: '🛋️',
    description: 'Interior finishing & false ceiling work',
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

/** Trades + Drawing & Design — all use role `service_provider`. */
export function isProviderSpecialtyType(
  value: string | null | undefined,
): value is ProviderSpecialtyType {
  return isTradeServiceType(value) || isDrawingDesignServiceType(value);
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

export function getProviderSpecialtyLabel(value: string | null | undefined): string {
  if (isDrawingDesignServiceType(value)) return 'Drawing and Design';
  return getTradeLabel(value);
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
    label: 'Mistri Worker',
    emoji: '👷',
    description: 'Labour-only ₹/sqft bidding',
  },
  {
    value: 'construction_firm',
    label: 'Construction Firm',
    emoji: '🏢',
    description: 'Turnkey ₹/sqft bidding',
  },
  {
    value: 'drawing_design',
    label: 'Drawing and Design',
    emoji: '✏️',
    description: '2D/3D plans, structural, electrical & plumbing drawings',
  },
  ...TRADE_SERVICE_OPTIONS.map((t) => ({
    value: t.value, label: t.label, emoji: t.emoji, description: t.description,
  })),
];

/** Categories shown on homepage / post-project pickers (respects feature flags). */
export function getVisibleServiceCategories(): ServiceCategoryOption[] {
  if (isConstructionFirmEnabled()) return ALL_SERVICE_CATEGORIES;
  return ALL_SERVICE_CATEGORIES.filter((c) => c.value !== 'construction_firm');
}

/** Provider signup grid — Construction Firm is never offered here. */
export function getProviderSignupCategories(): ServiceCategoryOption[] {
  return ALL_SERVICE_CATEGORIES.filter((c) => c.value !== 'construction_firm');
}

export const PRIMARY_PROVIDER_SIGNUP_SERVICE = 'labour_contractor' as const;

export function getProviderSpecialtyEmoji(value: string | null | undefined): string {
  const cat = ALL_SERVICE_CATEGORIES.find((c) => c.value === value);
  if (cat) return cat.emoji;
  return getTradeEmoji(value);
}
