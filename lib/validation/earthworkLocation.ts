export const EARTHWORK_VILLAGE_TOWN_ERROR =
  'Please enter a valid Village or Town name in Assam (numbers are not allowed).';

/** Letters and spaces only, with at least 3 letters. Numbers are rejected. */
export function validateEarthworkVillageTownName(value: string): string | null {
  const trimmed = value.trim();
  const letters = trimmed.replace(/[^\p{L}]/gu, '');
  if (!trimmed || !/^[\p{L}\s]+$/u.test(trimmed) || letters.length < 3) {
    return EARTHWORK_VILLAGE_TOWN_ERROR;
  }
  return null;
}

/** District, village, and pincode as one address, e.g. "Baksa, Barbari Village, 781344". */
export function formatEarthworkProjectLocation(
  district: string,
  villageOrTown: string,
  pincode: string,
): string {
  return [district.trim(), villageOrTown.trim(), pincode.trim()].filter(Boolean).join(', ');
}
