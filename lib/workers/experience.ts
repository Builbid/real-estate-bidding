/** Badge copy such as "8+ Years Experience". Returns null when experience is unknown. */
export function formatYearsExperience(years: number | null | undefined): string | null {
  if (years == null || !Number.isFinite(years) || years < 1) return null;
  return `${Math.floor(years)}+ Years Experience`;
}
