// ============================================================
// Shared helpers for the "Copy requirements from: [Select Floor]"
// dropdown shown on every floor section after the first one in the
// multi-floor requirement forms (Electrician, Plumber, Mistri, ...).
// ============================================================

import type { PlumbingTargetFloor } from './tradeWorkDetails';

export interface FloorCopyOption {
  /** Stable key of the source floor (floor id / work key). */
  value: string;
  /** Human readable floor label, e.g. "RCC 1st Floor". */
  label: string;
}

/** Value of the "Deselect / Clear / Manual" entry in the dropdown. */
export const FLOOR_COPY_MANUAL_VALUE = '';

/** Shown until the owner picks a source floor (or Manual). */
export const FLOOR_COPY_PLACEHOLDER_VALUE = '__select_floor__';
export const FLOOR_COPY_PLACEHOLDER_LABEL = 'Select Floor';

export const FLOOR_COPY_LABEL = 'Copy requirements from:';
export const FLOOR_COPY_MANUAL_LABEL = 'Deselect / Clear / Manual';

const TARGET_FLOOR_ORDER: readonly PlumbingTargetFloor[] = [
  'ground',
  'first',
  'second',
  'third',
  'fourth',
  'custom',
];

/** Floors in building order (Ground, 1st, 2nd ... custom floors last). */
export function sortTargetFloors(
  floors: readonly PlumbingTargetFloor[],
): PlumbingTargetFloor[] {
  return [...floors].sort(
    (a, b) => TARGET_FLOOR_ORDER.indexOf(a) - TARGET_FLOOR_ORDER.indexOf(b),
  );
}

/**
 * Label shown for a copy source. With a single earlier floor the dropdown reads
 * "Same as <floor>", otherwise the plain floor name is listed.
 */
export function floorCopyOptionLabel(label: string, totalOptions: number): string {
  return totalOptions === 1 ? `Same as ${label}` : label;
}

/**
 * Selected source for the dropdown: a still-available source floor, '' for manual
 * entry, or null when the owner has not chosen anything yet (or the source floor
 * was removed from the selection).
 */
export function resolveFloorCopySource(
  value: string | undefined,
  options: readonly FloorCopyOption[],
): string | null {
  if (value === FLOOR_COPY_MANUAL_VALUE) return FLOOR_COPY_MANUAL_VALUE;
  if (value && options.some((o) => o.value === value)) return value;
  return null;
}

/** Copies only the listed keys from `source` onto `target` (other keys untouched). */
export function copyDraftFields<K extends string>(
  keys: readonly K[],
  source: Record<K, string>,
  target: Record<K, string>,
): Record<K, string> {
  const next = { ...target };
  for (const key of keys) next[key] = source[key] ?? '';
  return next;
}
