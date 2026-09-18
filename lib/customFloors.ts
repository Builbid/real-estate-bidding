import {
  MAX_CUSTOM_RCC_FLOOR,
  MIN_CUSTOM_RCC_FLOOR,
  parseCustomFloorSequence,
} from '@/lib/mistriDetails';

export { MAX_CUSTOM_RCC_FLOOR, MIN_CUSTOM_RCC_FLOOR };

export type CustomFloorsValue = number[] | string | number | null | undefined;

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
  if (n <= 4 || n > MAX_CUSTOM_RCC_FLOOR) {
    return {
      floors: [...floors],
      added: false,
      error: `Floor must be a number from ${MIN_CUSTOM_RCC_FLOOR} to ${MAX_CUSTOM_RCC_FLOOR}.`,
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
