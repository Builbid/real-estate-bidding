import { createClient } from '@/lib/supabase/server';
import { DEMO_RANKED_WORKERS } from '@/lib/data/demoWorkers';
import { computeRatingStats } from '@/lib/builderRatings';
import {
  categoryLabel,
  resolveWorkerCategory,
  sortWorkersByRank,
  type RankedWorker,
} from '@/lib/workers/types';

type PublicRow = {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
  is_verified?: boolean;
};

function mapRowToWorker(
  row: PublicRow,
  rating: number,
  reviewsCount: number,
  serviceType?: string | null,
): RankedWorker {
  const category = resolveWorkerCategory(serviceType, row.role);
  return {
    id: row.id,
    name: row.full_name,
    location: row.is_verified ? 'Verified on BuilBid' : 'Assam',
    rating,
    reviewsCount,
    category,
    categoryLabel: categoryLabel(category),
    avatarUrl:
      row.avatar_url ??
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.full_name)}`,
    portfolioLink: `/builder/${row.id}`,
    isVerified: row.is_verified ?? false,
  };
}

async function fetchLiveWorkers(): Promise<RankedWorker[]> {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('id, full_name, role, avatar_url, is_verified')
    .in('role', ['labour_contractor', 'service_provider'])
    .order('is_verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(48);

  if (!profiles?.length) return [];

  const ids = profiles.map((p) => p.id);

  const [{ data: ratingRows }, { data: serviceRows }] = await Promise.all([
    supabase.from('builder_ratings').select('builder_id, rating').in('builder_id', ids),
    supabase.from('profiles').select('id, service_type').in('id', ids),
  ]);

  const ratingsByBuilder = new Map<string, { rating: number }[]>();
  for (const row of ratingRows ?? []) {
    const list = ratingsByBuilder.get(row.builder_id) ?? [];
    list.push({ rating: row.rating });
    ratingsByBuilder.set(row.builder_id, list);
  }

  const serviceById = new Map<string, string | null>();
  for (const row of serviceRows ?? []) {
    serviceById.set(row.id, row.service_type ?? null);
  }

  return profiles.map((row) => {
    const stats = computeRatingStats(ratingsByBuilder.get(row.id) ?? []);
    const rating = stats.total > 0 ? stats.average : 4.5;
    return mapRowToWorker(row, rating, stats.total, serviceById.get(row.id));
  });
}

/** Live ranked workers with demo fallback when the directory is empty. */
export async function getRankedWorkers(): Promise<RankedWorker[]> {
  try {
    const live = await fetchLiveWorkers();
    if (live.length > 0) return sortWorkersByRank(live);
  } catch {
    // Fall through to curated demo directory.
  }
  return sortWorkersByRank(DEMO_RANKED_WORKERS);
}
