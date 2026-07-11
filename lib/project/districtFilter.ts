/** Known district name variants used when posting projects. */
const DISTRICT_ALIASES: Record<string, readonly string[]> = {
  'Kamrup (Guwahati)': ['Kamrup Metropolitan'],
  'Kamrup Metropolitan': ['Kamrup (Guwahati)'],
};

export function matchesDistrictFilter(projectDistrict: string, filterDistrict: string): boolean {
  if (!filterDistrict || filterDistrict === 'all') return true;
  if (projectDistrict === filterDistrict) return true;

  const aliases = DISTRICT_ALIASES[filterDistrict] ?? [];
  return aliases.includes(projectDistrict);
}

export function getUniqueDistrictsFromProjects(
  projects: readonly { district: string }[],
): string[] {
  const seen = new Set<string>();
  const districts: string[] = [];

  for (const project of projects) {
    const district = project.district?.trim();
    if (!district || seen.has(district)) continue;
    seen.add(district);
    districts.push(district);
  }

  return districts.sort((a, b) => a.localeCompare(b));
}

export function searchDistrictOptions(query: string, districts: readonly string[]): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...districts];
  return districts.filter((d) => d.toLowerCase().includes(q));
}
