import { createClient } from '@/lib/supabase/server';
import type { Project } from '@/lib/types';
import type { ShowcaseProject } from '@/lib/projectShowcase';
import { PROJECTS_PAGE_SIZE } from '@/lib/projects/constants';

export { PROJECTS_PAGE_SIZE };

type ProjectRow = Project & {
  owner: { id: string; full_name: string } | null;
  bids: [{ count: number }] | null;
};

export interface ActiveProjectsPageResult {
  projects: ShowcaseProject[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

/** Escape characters that break PostgREST `or` / `ilike` filter values. */
function sanitizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,.()"'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function attachLowestRates(
  rows: ProjectRow[],
): Promise<ShowcaseProject[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const projectIds = rows.map((row) => row.id);
  const { data: bidRows } = await supabase
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

export async function fetchActiveProjectsPage(options: {
  offset?: number;
  limit?: number;
  search?: string;
  expireStale?: boolean;
}): Promise<ActiveProjectsPageResult> {
  const search = sanitizeSearchTerm(options.search ?? '');

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (options.expireStale !== false) {
    await supabase.rpc('expire_active_projects');
  }

  // Fetch all live active projects — no .limit() / .range() pagination.
  let query = supabase
    .from('projects')
    .select('*, owner:profiles_public!owner_id(id, full_name), bids(count)', {
      count: 'exact',
    })
    .eq('status', 'active_24h')
    .gt('bidding_ends_at', now)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,district.ilike.%${search}%,state.ilike.%${search}%`,
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('fetchActiveProjectsPage:', error.message);
    return { projects: [], total: 0, hasMore: false, nextOffset: 0 };
  }

  const rows = (data ?? []) as ProjectRow[];
  const projects = await attachLowestRates(rows);
  const total = count ?? projects.length;

  return {
    projects,
    total,
    hasMore: false,
    nextOffset: projects.length,
  };
}
