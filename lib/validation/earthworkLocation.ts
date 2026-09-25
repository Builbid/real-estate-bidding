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

/** Maps search query, e.g. "Barbari Village, Baksa, Assam, 781344". */
export function formatEarthworkMapsQuery(
  villageOrTown: string,
  district: string,
  pincode: string,
): string {
  return [villageOrTown.trim(), district.trim(), 'Assam', pincode.trim()].filter(Boolean).join(', ');
}

export function readEarthworkVillageName(tradeDetails: unknown): string {
  if (!tradeDetails || typeof tradeDetails !== 'object') return '';
  const village = (tradeDetails as { villageTownName?: unknown }).villageTownName;
  return typeof village === 'string' ? village.trim() : '';
}

export type EarthworkCardLocation = {
  village: string;
  district: string;
  pincode: string;
  address: string;
  mapsQuery: string;
};

export function earthworkCardLocation(project: {
  service_type?: string | null;
  district?: string | null;
  pincode?: string | null;
  trade_details?: unknown;
}): EarthworkCardLocation | null {
  if (project.service_type !== 'earthwork') return null;
  const village = readEarthworkVillageName(project.trade_details);
  const district = project.district?.trim() ?? '';
  const pincode = project.pincode?.trim() ?? '';
  if (!village && !district && !pincode) return null;
  return {
    village,
    district,
    pincode,
    address: formatEarthworkProjectLocation(district, village, pincode),
    mapsQuery: formatEarthworkMapsQuery(village, district, pincode),
  };
}

function compactLocationText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Hide Specific Details when the text only repeats the earthwork address. */
export function earthworkSpecificDetailsText(
  description: string | null | undefined,
  location: EarthworkCardLocation | null,
): string | null {
  const text = description?.trim() ?? '';
  if (!text) return null;
  if (!location) return text;
  const normalized = compactLocationText(text);
  const duplicates = [
    location.address,
    location.village,
    location.district,
    location.pincode,
    location.mapsQuery,
    [location.district, location.village].filter(Boolean).join(', '),
    [location.district, 'Assam'].filter(Boolean).join(', '),
    [location.village, location.district, 'Assam'].filter(Boolean).join(', '),
  ]
    .map(compactLocationText)
    .filter(Boolean);
  if (duplicates.includes(normalized)) return null;
  return text;
}
