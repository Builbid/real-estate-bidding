import type { SupabaseClient } from '@supabase/supabase-js';

type BidRow = {
  builder_id: string | null;
  is_withdrawn?: boolean | null;
  total_sum_metric?: number | string | null;
};

/**
 * The worker an owner selected, or the lowest bid when the award was not stored.
 * Withdrawn bids still count so a recorded selection is not treated as missing.
 */
export async function resolveProjectWorkerId(
  admin: SupabaseClient,
  projectId: string,
  selectedBuilderId?: string | null,
): Promise<string | null> {
  const selected = selectedBuilderId?.trim() || '';
  if (selected) return selected;

  const { data } = await admin
    .from('bids')
    .select('builder_id, is_withdrawn, total_sum_metric')
    .eq('project_id', projectId)
    .limit(100);

  const bids = ((data ?? []) as BidRow[]).filter((bid) => Boolean(bid.builder_id));
  const active = bids.filter((bid) => bid.is_withdrawn !== true);
  const pool = active.length > 0 ? active : bids;
  if (pool.length === 0) return null;

  pool.sort((a, b) => Number(a.total_sum_metric ?? 0) - Number(b.total_sum_metric ?? 0));
  return pool[0]?.builder_id ?? null;
}

/** Persists a resolved worker when the project has none, without overwriting an owner award. */
export async function ensureProjectWorkerId(
  admin: SupabaseClient,
  projectId: string,
  selectedBuilderId?: string | null,
): Promise<string | null> {
  const existing = selectedBuilderId?.trim() || '';
  if (existing) return existing;

  const resolved = await resolveProjectWorkerId(admin, projectId, null);
  if (!resolved) return null;

  await admin
    .from('projects')
    .update({ selected_builder_id: resolved, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .is('selected_builder_id', null);

  const { data } = await admin
    .from('projects')
    .select('selected_builder_id')
    .eq('id', projectId)
    .maybeSingle();

  const stored = typeof data?.selected_builder_id === 'string' ? data.selected_builder_id.trim() : '';
  return stored || resolved;
}
