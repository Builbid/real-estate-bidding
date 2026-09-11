import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project } from '@/lib/types';

export const DASHBOARD_COMPLETED_LIMIT = 10;
export const COMPLETED_HISTORY_PAGE_SIZE = 20;

export type CompletedProjectWithBids = Project & { bids?: [{ count: number }] };

export function parseHistoryPage(raw: string | undefined): number {
  const page = Number(raw);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export async function fetchWorkerCompletedPreview(
  supabase: SupabaseClient,
  workerId: string,
): Promise<{ projects: CompletedProjectWithBids[]; totalCount: number }> {
  const { data, count } = await supabase
    .from('projects')
    .select('*, bids(count)', { count: 'exact' })
    .eq('selected_builder_id', workerId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(DASHBOARD_COMPLETED_LIMIT);

  const projects = (data ?? []) as CompletedProjectWithBids[];
  return { projects, totalCount: count ?? projects.length };
}

