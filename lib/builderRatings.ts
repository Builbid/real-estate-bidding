// ============================================================
// Builder rating utilities — stats, masking, privacy helpers
// ============================================================

export interface BuilderRatingDistribution {
  '5': number;
  '4': number;
  '3': number;
  '2': number;
  '1': number;
}

export interface BuilderReview {
  rating: number;
  review: string | null;
  created_at: string;
  owner_name: string;
}

export interface BuilderRatingStats {
  total: number;
  positive: number;
  negative: number;
  average: number;
  distribution: BuilderRatingDistribution;
  reviews: BuilderReview[];
}

export const EMPTY_RATING_STATS: BuilderRatingStats = {
  total: 0,
  positive: 0,
  negative: 0,
  average: 0,
  distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
  reviews: [],
};

/** Mask owner name for public review display (e.g. "Rahul K." or "A***"). */
export function maskOwnerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Anonymous';
  if (parts.length === 1) return `${parts[0].charAt(0)}***`;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

/** Initials for avatar placeholder from a (possibly masked) name. */
export function ownerInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Compute average and distribution from raw rating rows. */
export function computeRatingStats(
  rows: { rating: number; review?: string | null; created_at?: string; owner_name?: string }[]
): BuilderRatingStats {
  if (rows.length === 0) return EMPTY_RATING_STATS;

  const distribution: BuilderRatingDistribution = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  let sum = 0;
  let positive = 0;
  let negative = 0;

  for (const row of rows) {
    sum += row.rating;
    if (row.rating >= 4) positive++;
    if (row.rating <= 2) negative++;
    const key = String(row.rating) as keyof BuilderRatingDistribution;
    if (key in distribution) distribution[key]++;
  }

  return {
    total: rows.length,
    positive,
    negative,
    average: Math.round((sum / rows.length) * 10) / 10,
    distribution,
    reviews: rows
      .filter((r) => r.created_at)
      .map((r) => ({
        rating: r.rating,
        review: r.review ?? null,
        created_at: r.created_at!,
        owner_name: r.owner_name ?? 'Anonymous',
      })),
  };
}

/** Percentage of ratings at a given star level (0–100). */
export function starPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

/** Display average — defaults to "New" when no ratings exist. */
export function formatBuilderAverage(average: number, total: number): string {
  if (total === 0) return 'New';
  return average.toFixed(1);
}
