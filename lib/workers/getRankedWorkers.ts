import { createClient } from '@/lib/supabase/server';
import { DEMO_RANKED_WORKERS } from '@/lib/data/demoWorkers';
import {
  categoryLabel,
  resolveWorkerCategory,
  sortWorkersForDirectory,
  type RankedWorker,
} from '@/lib/workers/types';

type PublicRow = {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  service_type?: string | null;
  years_in_business?: number | null;
};

function mapRowToWorker(row: PublicRow, serviceType?: string | null): RankedWorker {
  const category = resolveWorkerCategory(serviceType, row.role);
  const years = row.years_in_business;
  return {
    id: row.id,
    name: row.full_name,
    location: row.is_verified ? 'Verified on BuilBid' : 'Assam',
    rating: 0,
    reviewsCount: 0,
    yearsOfExperience: typeof years === 'number' && years > 0 ? Math.floor(years) : null,
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

  const query = (columns: string) =>
    supabase
      .from('profiles_public')
      .select(columns)
      .in('role', ['labour_contractor', 'service_provider'])
      .order('created_at', { ascending: false })
      .limit(48);

  let { data: profiles, error } = await query(
    'id, full_name, role, avatar_url, is_verified, service_type, years_in_business',
  );

  if (error) {
    const retry = await query('id, full_name, role, avatar_url, is_verified, service_type');
    profiles = retry.data;
    error = retry.error;
  }

  if (error || !profiles?.length) return [];

  const rows = profiles as unknown as PublicRow[];

  return rows
    .map((row) => mapRowToWorker(row, row.service_type))
    .filter((worker) => worker.category !== 'false_ceiling_work');
}

/** Live workers with a demo fallback when the directory is empty. Not star-ranked. */
export async function getRankedWorkers(): Promise<RankedWorker[]> {
  try {
    const live = await fetchLiveWorkers();
    if (live.length > 0) return sortWorkersForDirectory(live);
  } catch {
    // Fall through to curated demo directory.
  }
  return sortWorkersForDirectory(DEMO_RANKED_WORKERS);
}
