import type { SupabaseClient } from '@supabase/supabase-js';
import { sortByCreatedAtDesc } from '@/lib/utils';
import type { Project } from '@/lib/types';

export const DASHBOARD_COMPLETED_LIMIT = 10;
export const COMPLETED_HISTORY_PAGE_SIZE = 20;

export type CompletedProjectWithBids = Project & { bids?: [{ count: number }] };

export function isCancelledStatus(status: string | null | undefined): boolean {
  return status === 'cancelled';
}

type AgreementSignals = {
  status?: string | null;
  selected_builder_id?: string | null;
  agreement_completed?: boolean | null;
  agreement_status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

/** Statuses written only when a supervisor or admin finishes the agreement. */
const SIGNED_AGREEMENT_STATUSES = new Set(['approved_active', 'signed', 'completed']);

/**
 * Awards finished before the supervisor prototype reset have no agreement_status.
 * Newer rows stay in Agreement Process Running until a supervisor signs them.
 */
export const LEGACY_AGREEMENT_CUTOFF = '2026-10-03T14:55:00.000Z';

function isExplicitlySigned(project: AgreementSignals): boolean {
  return SIGNED_AGREEMENT_STATUSES.has(
    String(project.agreement_status ?? '').trim().toLowerCase(),
  );
}

/** Signed or approved agreements belong in Completed Projects. */
export function isAgreementComplete(project: AgreementSignals): boolean {
  if (isExplicitlySigned(project)) return true;
  const status = String(project.status ?? '').trim().toLowerCase();
  if (status !== 'completed' || project.agreement_completed !== true) return false;
  const stamp = Date.parse(project.updated_at || project.created_at || '');
  return Number.isFinite(stamp) && stamp < Date.parse(LEGACY_AGREEMENT_CUTOFF);
}

/** PostgREST `or` filter matching {@link isAgreementComplete}. */
export function completedAgreementOrFilter(): string {
  return [
    'agreement_status.eq.approved_active',
    'agreement_status.eq.signed',
    'agreement_status.eq.completed',
    `and(status.eq.completed,agreement_completed.eq.true,updated_at.lt.${LEGACY_AGREEMENT_CUTOFF})`,
  ].join(',');
}

/** Owner has chosen a builder and the official agreement is not signed yet. */
export function isAwaitingAgreement(project: AgreementSignals): boolean {
  return Boolean(project.selected_builder_id) && !isAgreementComplete(project);
}

export function parseHistoryPage(raw: string | undefined): number {
  const page = Number(raw);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export async function fetchWorkerCompletedPreview(
  supabase: SupabaseClient,
  workerId: string,
): Promise<{ projects: CompletedProjectWithBids[]; totalCount: number }> {
  const signed = await supabase
    .from('projects')
    .select('*, bids(count)', { count: 'exact' })
    .eq('selected_builder_id', workerId)
    .or(completedAgreementOrFilter())
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_COMPLETED_LIMIT);

  const result = signed.error
    ? await supabase
        .from('projects')
        .select('*, bids(count)', { count: 'exact' })
        .eq('selected_builder_id', workerId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(DASHBOARD_COMPLETED_LIMIT)
    : signed;

  const projects = sortByCreatedAtDesc(
    ((result.data ?? []) as CompletedProjectWithBids[]).filter(isAgreementComplete),
  );
  return { projects, totalCount: result.count ?? projects.length };
}

