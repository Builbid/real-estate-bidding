/**
 * Short public BuilBid ID for agreements and profiles (e.g. BB-FBC030A1).
 * Deterministic from the profile UUID — not a separate DB column.
 */
export function formatBuilbidPublicId(id: string | null | undefined): string {
  const raw = id?.trim();
  if (!raw) return '—';
  if (/^BB-[0-9A-Z]{6,10}$/i.test(raw)) return raw.toUpperCase();
  const hex = raw.replace(/-/g, '').toUpperCase();
  if (/^[0-9A-F]{8,}$/.test(hex)) {
    return `BB-${hex.slice(0, 8)}`;
  }
  const compact = raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (compact.length >= 6) return `BB-${compact.slice(0, 8)}`;
  return `BB-${compact || 'UNKNOWN'}`;
}
