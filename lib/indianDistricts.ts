import DISTRICTS from '@/app/data/districts.json';

export interface IndianDistrict {
  district: string;
  state: string;
}

/** Display label: "District Name, State Name" */
export function formatIndianDistrict({ district, state }: IndianDistrict): string {
  return `${district}, ${state}`;
}

export const INDIAN_DISTRICTS: IndianDistrict[] = DISTRICTS;

const formattedLookup = new Map<string, IndianDistrict>(
  INDIAN_DISTRICTS.map((entry) => [formatIndianDistrict(entry).toLowerCase(), entry]),
);

export function searchIndianDistricts(query: string, limit = 10): IndianDistrict[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches: IndianDistrict[] = [];
  for (const entry of INDIAN_DISTRICTS) {
    const label = formatIndianDistrict(entry).toLowerCase();
    if (label.includes(q) || entry.district.toLowerCase().includes(q)) {
      matches.push(entry);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export function parseIndianDistrictSelection(value: string): IndianDistrict | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return formattedLookup.get(trimmed.toLowerCase()) ?? null;
}

export function isValidIndianDistrictSelection(value: string): boolean {
  return parseIndianDistrictSelection(value) !== null;
}
