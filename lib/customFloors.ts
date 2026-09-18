import {
  MAX_CUSTOM_RCC_FLOOR,
  MIN_CUSTOM_RCC_FLOOR,
  parseCustomFloorSequence,
} from '@/lib/mistriDetails';

export { MAX_CUSTOM_RCC_FLOOR, MIN_CUSTOM_RCC_FLOOR };

/** Highest floor shown in the custom-floor picker (new selections). */
export const SELECTABLE_CUSTOM_RCC_FLOOR_MAX = 20;

export type CustomFloorsValue = number[] | string | number | null | undefined;

export function selectableCustomFloorNumbers(): number[] {
  const floors: number[] = [];
  for (let n = MIN_CUSTOM_RCC_FLOOR; n <= SELECTABLE_CUSTOM_RCC_FLOOR_MAX; n++) {
    floors.push(n);
  }
  return floors;
}

/** Canonical custom-floor list: unique integers from 5–50, sorted ascending. */
export function normalizeCustomFloors(raw: CustomFloorsValue | unknown): number[] {
  return parseCustomFloorSequence(raw, { allowGaps: true }) ?? [];
}

export function formatCustomFloorsList(raw: CustomFloorsValue | unknown): string {
  const floors = normalizeCustomFloors(raw);
  return floors.length ? floors.join(', ') : '';
}

export function tryAddCustomFloor(
  floors: readonly number[],
  raw: string,
): { floors: number[]; added: boolean; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { floors: [...floors], added: false };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      floors: [...floors],
      added: false,
      error: 'Enter a whole floor number above 4.',
    };
  }
  const n = Number.parseInt(trimmed, 10);
  if (n < MIN_CUSTOM_RCC_FLOOR || n > SELECTABLE_CUSTOM_RCC_FLOOR_MAX) {
    return {
      floors: [...floors],
      added: false,
      error: `Floor must be a number from ${MIN_CUSTOM_RCC_FLOOR} to ${SELECTABLE_CUSTOM_RCC_FLOOR_MAX}.`,
    };
  }
  if (floors.includes(n)) {
    return { floors: [...floors], added: false };
  }
  return {
    floors: [...floors, n].sort((a, b) => a - b),
    added: true,
  };
}

export function removeCustomFloor(floors: readonly number[], n: number): number[] {
  return floors.filter((floor) => floor !== n);
}

export function mergeSelectableCustomFloors(
  current: readonly number[],
  selected: readonly number[],
): number[] {
  const keptAboveRange = current.filter((n) => n > SELECTABLE_CUSTOM_RCC_FLOOR_MAX);
  const nextSelectable = selected.filter(
    (n) => n >= MIN_CUSTOM_RCC_FLOOR && n <= SELECTABLE_CUSTOM_RCC_FLOOR_MAX,
  );
  return [...new Set([...keptAboveRange, ...nextSelectable])].sort((a, b) => a - b);
}
