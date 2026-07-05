/** Major Assam districts for construction firm project posting */
export const ASSAM_DISTRICTS = [
  'Kamrup (Guwahati)',
  'Jorhat',
  'Dibrugarh',
  'Silchar',
  'Tezpur',
  'Nagaon',
  'Tinsukia',
  'Sivasagar',
  'Bongaigaon',
  'Dhubri',
  'Goalpara',
  'Lakhimpur',
  'Sonitpur',
  'Cachar',
  'Kokrajhar',
  'Nalbari',
  'Barpeta',
  'Darrang',
] as const;

export type AssamDistrict = (typeof ASSAM_DISTRICTS)[number];

export const ASSAM_OTHER = 'Other (specify)' as const;

export function parseDistrictSelection(value: string): { district: string; state: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('Other:')) {
    const custom = trimmed.slice(6).trim();
    return custom ? { district: custom, state: 'Assam' } : null;
  }
  if (trimmed === ASSAM_OTHER) return null;
  return { district: trimmed, state: 'Assam' };
}
