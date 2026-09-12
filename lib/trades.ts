// ============================================================
// Trade Service Bidding — shared config for the trades that
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

/** Active trades offered for signup and new project posting. */
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
    value: 'earthwork',
    label: 'Earthwork',
    emoji: '🚜',
    description: 'Excavation & earthwork',
  },
];

export const TRADE_SERVICE_VALUES: TradeServiceType[] = TRADE_SERVICE_OPTIONS.map((o) => o.value);

/** Standalone Carpenter was removed; existing DB rows may still use this value. */
export const LEGACY_CARPENTER_SERVICE = 'carpenter' as const;

/** Interior Work was removed; existing DB rows may still use this value. */
export const LEGACY_INTERIOR_WORK_SERVICE = 'false_ceiling_work' as const;

export function isLegacyCarpenterService(value: string | null | undefined): boolean {
  return value === LEGACY_CARPENTER_SERVICE;
}

export function isLegacyInteriorWorkService(value: string | null | undefined): boolean {
  return value === LEGACY_INTERIOR_WORK_SERVICE;
}

/** True for any retired trade that must not appear in signup / post-project pickers. */
export function isRetiredTradeService(value: string | null | undefined): boolean {
  return isLegacyCarpenterService(value) || isLegacyInteriorWorkService(value);
}

/** Active trades only (excludes retired Interior Work / Carpenter). */
export function isActiveTradeServiceType(
  value: string | null | undefined,
): value is Exclude<TradeServiceType, 'carpenter' | 'false_ceiling_work'> {
  if (!value) return false;
  return (TRADE_SERVICE_VALUES as string[]).includes(value);
}

/**
 * Active trades + legacy Interior Work (for existing projects / bids).
 * Carpenter stays excluded (mapped to Mistri elsewhere).
 */
export function isTradeServiceType(value: string | null | undefined): value is TradeServiceType {
  if (!value) return false;
  return isActiveTradeServiceType(value) || isLegacyInteriorWorkService(value);
}

/** Trades + Drawing & Design offered for new provider registration. */
export function isProviderSpecialtyType(
  value: string | null | undefined,
): value is ProviderSpecialtyType {
  return isActiveTradeServiceType(value) || isDrawingDesignServiceType(value);
}

export function getTradeOption(value: string | null | undefined): TradeServiceOption | undefined {
  if (isLegacyInteriorWorkService(value)) {
    return {
      value: LEGACY_INTERIOR_WORK_SERVICE,
      label: 'Interior Work',
      emoji: '🛋️',
      description: 'Interior finishing, false ceiling & modular kitchen',
    };
  }
  return TRADE_SERVICE_OPTIONS.find((o) => o.value === value);
}

export function getTradeLabel(value: ServiceType | string | null | undefined): string {
  if (isLegacyCarpenterService(value)) return 'Mistri Worker';
  if (isLegacyInteriorWorkService(value)) return 'Interior Work';
  return getTradeOption(value)?.label ?? 'Service Provider';
}

export function getTradeEmoji(value: ServiceType | string | null | undefined): string {
  if (isLegacyInteriorWorkService(value)) return '🛋️';
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

/** Every active service a client can post / a provider can register for. */
export const ALL_SERVICE_CATEGORIES: ServiceCategoryOption[] = [
  {
    value: 'labour_contractor',
    label: 'Mistri Worker',
    emoji: '👷',
    description: 'Labour-only ₹/sqft bidding, including door & window frames',
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
