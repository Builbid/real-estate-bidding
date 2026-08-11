/** All 35 Assam districts for project posting (alphabetical A–Z). */
export const ASSAM_DISTRICTS = [
  'Bajali',
  'Baksa',
  'Barpeta',
  'Biswanath',
  'Bongaigaon',
  'Cachar',
  'Charaideo',
  'Chirang',
  'Darrang',
  'Dhemaji',
  'Dhubri',
  'Dibrugarh',
  'Dima Hasao',
  'Goalpara',
  'Golaghat',
  'Hailakandi',
  'Hojai',
  'Jorhat',
  'Kamrup',
  'Kamrup Metropolitan',
  'Karbi Anglong',
  'Karimganj',
  'Kokrajhar',
  'Lakhimpur',
  'Majuli',
  'Morigaon',
  'Nagaon',
  'Nalbari',
  'Sivasagar',
  'Sonitpur',
  'South Salmara-Mankachar',
  'Tamulpur',
  'Tinsukia',
  'Udalguri',
  'West Karbi Anglong',
] as const;

export type AssamDistrict = (typeof ASSAM_DISTRICTS)[number];

export const ASSAM_OTHER = 'Other (specify)' as const;

const districtLookup = new Map(
  ASSAM_DISTRICTS.map((district) => [district.toLowerCase(), district]),
);

/**
 * Rank/filter Assam districts by query.
 * Empty query → full alphabetical list.
 * Non-empty → startsWith matches first, then includes, both A–Z within tier.
 */
export function searchAssamDistricts(query: string): AssamDistrict[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...ASSAM_DISTRICTS];

  const starts: AssamDistrict[] = [];
  const includes: AssamDistrict[] = [];

  for (const district of ASSAM_DISTRICTS) {
    const lower = district.toLowerCase();
    if (lower.startsWith(q)) {
      starts.push(district);
    } else if (lower.includes(q)) {
      includes.push(district);
    }
  }

  return [...starts, ...includes];
}

export function parseAssamDistrictSelection(
  value: string,
): { district: AssamDistrict; state: 'Assam' } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = districtLookup.get(trimmed.toLowerCase());
  return match ? { district: match, state: 'Assam' } : null;
}

/** @deprecated Prefer parseAssamDistrictSelection */
export function parseDistrictSelection(value: string): { district: string; state: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('Other:')) {
    const custom = trimmed.slice(6).trim();
    return custom ? { district: custom, state: 'Assam' } : null;
  }
  if (trimmed === ASSAM_OTHER) return null;
  return parseAssamDistrictSelection(trimmed);
}
