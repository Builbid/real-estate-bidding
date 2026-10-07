import type { SupabaseClient } from '@supabase/supabase-js';
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
};

/** Signed or approved agreements belong in Completed Projects. */
export function isAgreementComplete(project: AgreementSignals): boolean {
  if (project.agreement_completed === true) return true;
  const agreementStatus = String(project.agreement_status ?? '').trim().toLowerCase();
  if (
    agreementStatus === 'approved_active' ||
    agreementStatus === 'signed' ||
    agreementStatus === 'completed'
  ) {
    return true;
  }
  return String(project.status ?? '').trim().toLowerCase() === 'completed';
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

