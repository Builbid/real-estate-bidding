import type { SupabaseClient } from '@supabase/supabase-js';
import { PROJECT_LIFETIME_MS, selectionDeadlineMs } from '@/lib/auction/selectionWindow';

type OpenProject = {
  id: string;
  status: string;
  created_at: string;
  bidding_ends_at: string;
  selection_ends_at: string | null;
  selected_builder_id: string | null;
};

async function markExpired(client: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const expired = await client
    .from('projects')
    .update({ status: 'expired' })
    .in('id', ids)
    .is('selected_builder_id', null);
  if (!expired.error) return;

  const enumMissing = /expired|invalid input value|enum|project_status/i.test(expired.error.message ?? '');
  if (!enumMissing) {
    console.error('[auction] could not mark projects expired:', expired.error.message);
    return;
  }

  const cancelled = await client
    .from('projects')
    .update({ status: 'cancelled' })
    .in('id', ids)
    .is('selected_builder_id', null);
  if (cancelled.error) {
    console.error('[auction] could not close expired projects:', cancelled.error.message);
  }
}

/**
 * Enforces 24h bidding + 24h selection, capped at 48h from posting.
 * Zero-bid projects expire when bidding ends. Unawarded projects expire when
 * the selection window or the 48-hour lifetime ends.
 */
export async function expireProjectWindows(
  client: SupabaseClient,
  onlyProjectId?: string,
): Promise<void> {
  let query = client
    .from('projects')
    .select('id, status, created_at, bidding_ends_at, selection_ends_at, selected_builder_id')
    .in('status', ['active_24h', 'frozen_24h'])
    .is('selected_builder_id', null)
    .limit(500);
  if (onlyProjectId) query = query.eq('id', onlyProjectId);

  const { data, error } = await query;
  if (error) {
    console.error('[auction] could not load projects to expire:', error.message);
    return;
  }

  const rows = (data ?? []) as OpenProject[];
  if (rows.length === 0) return;

  const ids = rows.map((row) => row.id);
  const { data: bidRows, error: bidError } = await client
    .from('bids')
    .select('project_id')
    .in('project_id', ids)
    .eq('is_withdrawn', false);
  if (bidError) {
    console.error('[auction] could not count bids while expiring projects:', bidError.message);
    return;
  }

  const bidCount = new Map<string, number>();
  for (const bid of (bidRows ?? []) as Array<{ project_id: string }>) {
    bidCount.set(bid.project_id, (bidCount.get(bid.project_id) ?? 0) + 1);
  }

  const now = Date.now();
  const expireIds: string[] = [];
  const clamps: Array<{ id: string; selectionEndsAt: string; freeze: boolean }> = [];

  for (const row of rows) {
    const bids = bidCount.get(row.id) ?? 0;
    const biddingEnds = Date.parse(row.bidding_ends_at);
    const biddingEnded = Number.isFinite(biddingEnds) && biddingEnds <= now;
    const deadline = selectionDeadlineMs(row);
    const posted = Date.parse(row.created_at);
    const lifetimeEnded = Number.isFinite(posted) && posted + PROJECT_LIFETIME_MS <= now;

    if (lifetimeEnded || (biddingEnded && (bids === 0 || deadline <= now))) {
      expireIds.push(row.id);
      continue;
    }

    if (!biddingEnded || bids === 0) continue;

    const nextDeadline = new Date(deadline).toISOString();
    const stored = row.selection_ends_at ? Date.parse(row.selection_ends_at) : NaN;
    const needsClamp = !Number.isFinite(stored) || stored > deadline;
    if (row.status === 'active_24h' || needsClamp) {
      clamps.push({
        id: row.id,
        selectionEndsAt: nextDeadline,
        freeze: row.status === 'active_24h',
      });
    }
  }

  await markExpired(client, expireIds);

  await Promise.all(
    clamps.map((row) =>
      client
        .from('projects')
        .update({
          ...(row.freeze ? { status: 'frozen_24h' } : {}),
          selection_ends_at: row.selectionEndsAt,
        })
        .eq('id', row.id)
        .is('selected_builder_id', null),
    ),
  );
}
