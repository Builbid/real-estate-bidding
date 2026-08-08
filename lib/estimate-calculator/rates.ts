// ============================================================
// Finishing cost norms by BHK / area (standard-quality India)
// Defaults tuned for Assam / Tier-2 budgeting mid-2025–26.
// ============================================================

import type { BarDiameter, ItemRates, UnitType } from './types';

/** Bathrooms / wet areas per floor by unit type (standard apartment layout). */
export const BATHROOMS_PER_FLOOR: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 1,
  '2BHK': 2,
  '3BHK': 3,
  '4BHK': 4,
};

/** Internal doors per floor (excl. main door counted separately once). */
export const INTERNAL_DOORS_PER_FLOOR: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 3,
  '2BHK': 5,
  '3BHK': 7,
  '4BHK': 9,
};

/** Windows per floor (aluminium / uPVC standard). */
export const WINDOWS_PER_FLOOR: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 4,
  '2BHK': 6,
  '3BHK': 8,
  '4BHK': 10,
};

/** Modular kitchen running feet (standard L / parallel). */
export const MODULAR_KITCHEN_RFT: Record<Exclude<UnitType, 'Custom'>, number> = {
  '1BHK': 6,
  '2BHK': 8,
  '3BHK': 10,
  '4BHK': 12,
};

/**
 * Standard-quality finishing unit rates (₹) — used for allied works table.
 */
export const STANDARD_FINISH_RATES = {
  /** Putty + 2 coats acrylic emulsion — ₹ / sqft of painted surface. */
  paintingPerSqftSurface: 28,
  /** Vitrified tile flooring incl. labour + adhesive — ₹ / sqft. */
  tileFlooringPerSqft: 130,
  /** Granite / large-format stone mid grade — ₹ / sqft. */
  graniteFlooringPerSqft: 280,
  /** Carpet ≈ 75% of built-up for flooring (walls deducted). */
  flooringAreaFactor: 0.75,
  /** Plumbing piping + sanitary fittings — ₹ / toilet (user-entered count). */
  plumbingPerToilet: 55_000,
  /** @deprecated alias — use plumbingPerToilet */
  plumbingPerBathroom: 55_000,
  /** Toilet waterproofing + wet-area wall/floor tile package — ₹ / toilet. */
  toiletWetWorksPerToilet: 18_000,
  /** Kitchen wet-point package — ₹ / kitchen. */
  plumbingKitchenLump: 18_000,
  /** Concealed wiring + switches + DB (excl. fixtures) — ₹ / sqft built-up. */
  electricalPerSqftBuiltUp: 115,
  /** Flush / laminate internal door with frame + hardware. */
  internalDoorEach: 14_000,
  /** Main entrance teak/engineered door (once per dwelling). */
  mainDoorLump: 35_000,
  /** Aluminium / uPVC window unit average. */
  windowEach: 12_000,
  /** Modular kitchen — ₹ / running foot (particle board + laminate). */
  modularKitchenPerRft: 22_000,
  /** Formwork hire + labour — ₹ / sqm contact area. */
  formworkPerSqm: 220,
  /** Pre-construction anti-termite (IS 6313) — ₹ / sqft footprint. */
  antiTermitePerSqftFootprint: 22,
  /** Compacted soil / murum fill — ₹ / cum. */
  soilFillPerCum: 480,
} as const;

export function steelRateForDia(rates: ItemRates, diaMm: number): number {
  const key = diaMm as BarDiameter;
  return rates.steelPerQuintalByDia[key] ?? rates.steelPerQuintalByDia[12] ?? 5700;
}

export function bathroomsForUnit(unitType: UnitType, builtUpPerFloor: number): number {
  if (unitType !== 'Custom') return BATHROOMS_PER_FLOOR[unitType];
  return Math.max(1, Math.round(builtUpPerFloor / 450));
}

export function doorsPerFloorForUnit(unitType: UnitType, builtUpPerFloor: number): number {
  if (unitType !== 'Custom') return INTERNAL_DOORS_PER_FLOOR[unitType];
  return Math.max(3, Math.round(builtUpPerFloor / 180));
}

export function windowsPerFloorForUnit(unitType: UnitType, builtUpPerFloor: number): number {
  if (unitType !== 'Custom') return WINDOWS_PER_FLOOR[unitType];
  return Math.max(3, Math.round(builtUpPerFloor / 160));
}

export function kitchenRftForUnit(unitType: UnitType, builtUpPerFloor: number): number {
  if (unitType !== 'Custom') return MODULAR_KITCHEN_RFT[unitType];
  return Math.max(6, Math.round(builtUpPerFloor / 120));
}
