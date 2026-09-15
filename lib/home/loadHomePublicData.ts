import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getFeaturedPartners } from '@/lib/featured/getFeaturedPartners';
import { isProjectBiddingLive, type ShowcaseProject } from '@/lib/projectShowcase';
import type { Project } from '@/lib/types';
import type { DemoFirm } from '@/lib/data/demoFirms';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Homepage grid shows 6 cards; fetch extra so client search still has nearby matches. */
export const HOME_SHOWCASE_LIMIT = 12;
export const HOME_FROZEN_LIMIT = 6;
export const HOME_DATA_REVALIDATE_SECONDS = 60;

const HOME_PROJECT_SELECT =
  'id, owner_id, title, district, state, pincode, description, status, service_type, track_type, sub_configuration, total_floors, plot_area_sqft, floor_area_sqft, finishing_level, budget_range_min, budget_range_max, bidding_ends_at, selection_ends_at, created_at, updated_at, trade_details, painter_details, mistri_details, drawing_details, drawing_types, building_types, construction_types, owner:profiles_public!owner_id(id, full_name), bids(count)';

type ProjectRow = Project & {
  owner: { id: string; full_name: string } | null;
  bids: [{ count: number }] | null;
};

export interface HomePublicData {
  showcaseProjects: ShowcaseProject[];
  statValues: Record<string, number>;
  featuredFirms: DemoFirm[];
}

async function attachLowestRates(
  client: SupabaseClient,
  rows: ProjectRow[],
): Promise<ShowcaseProject[]> {
  if (rows.length === 0) return [];

  const projectIds = rows.map((row) => row.id);
  const { data: bidRows } = await client
    .from('bids')
    .select('project_id, total_sum_metric')
    .in('project_id', projectIds)
    .eq('is_withdrawn', false);

  const lowestByProject = new Map<string, number>();
  for (const bid of bidRows ?? []) {
    const current = lowestByProject.get(bid.project_id);
    if (current == null || bid.total_sum_metric < current) {
      lowestByProject.set(bid.project_id, bid.total_sum_metric);
    }
  }

  return rows.map((row) => ({
    ...row,
    owner: row.owner ?? undefined,
    bid_count: row.bids?.[0]?.count ?? 0,
    lowest_rate: lowestByProject.get(row.id) ?? null,
  }));
}

async function loadHomePublicDataWithClient(client: SupabaseClient): Promise<HomePublicData> {
  const now = new Date().toISOString();

  const [showcaseResult, frozenResult, totalProjects, liveCount, frozenCount, totalBids, featured] =
    await Promise.all([
      client
        .from('projects')
        .select(HOME_PROJECT_SELECT)
        .eq('status', 'active_24h')
        .gt('bidding_ends_at', now)
        .order('created_at', { ascending: false })
        .limit(HOME_SHOWCASE_LIMIT),
      client
        .from('projects')
        .select(HOME_PROJECT_SELECT)
        .eq('status', 'frozen_24h')
        .order('created_at', { ascending: false })
        .limit(HOME_FROZEN_LIMIT),
      client.from('projects').select('*', { count: 'estimated', head: true }),
      client
        .from('projects')
        .select('*', { count: 'estimated', head: true })
        .eq('status', 'active_24h')
        .gt('bidding_ends_at', now),
      client
        .from('projects')
        .select('*', { count: 'estimated', head: true })
        .eq('status', 'frozen_24h'),
      client.from('bid_submission_log').select('*', { count: 'estimated', head: true }),
      getFeaturedPartners(client),
    ]);

  const showcaseRows = (showcaseResult.data ?? []) as unknown as ProjectRow[];
  const frozenRows = (frozenResult.data ?? []) as unknown as ProjectRow[];
  const mergedRows = [...showcaseRows, ...frozenRows].filter(
    (row, index, rows) => rows.findIndex((item) => item.id === row.id) === index,
  );
  const showcaseProjects = await attachLowestRates(client, mergedRows);

  return {
    showcaseProjects,
    statValues: {
      active: liveCount.count ?? showcaseProjects.filter(isProjectBiddingLive).length,
      frozen: frozenCount.count ?? 0,
      total: totalProjects.count ?? 0,
      bids: totalBids.count ?? 0,
    },
    featuredFirms: featured.firms,
  };
}

const getCachedHomePublicData = unstable_cache(
  async () => loadHomePublicDataWithClient(createAdminClient()),
  ['home-public-v4'],
  { revalidate: HOME_DATA_REVALIDATE_SECONDS },
);

export async function loadHomePublicData(): Promise<HomePublicData> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    try {
      return await getCachedHomePublicData();
    } catch (err) {
      console.warn('Cached homepage data failed, falling back:', err);
    }
  }

  const supabase = await createClient();
  return loadHomePublicDataWithClient(supabase);
}
