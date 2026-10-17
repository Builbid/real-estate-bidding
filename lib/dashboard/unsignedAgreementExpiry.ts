import { isAgreementComplete } from '@/lib/dashboard/completedProjects';
import { timestampMillis } from '@/lib/utils';

/** Unsigned selections with no site checklist leave the active dashboards after this. */
export const UNSIGNED_AGREEMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

type SelectionClock = {
  builder_selected_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

/** When the owner chose a worker. Falls back to the row's last write, then creation. */
export function selectionStartedAt(project: SelectionClock): string | null {
  return project.builder_selected_at || project.updated_at || project.created_at || null;
}

/**
 * Agreement Process Running rows that should leave the active dashboards.
 * A saved site-visit checklist or a fully signed agreement keeps the project.
 */
export function isStaleUnsignedAgreement(
  project: SelectionClock & {
    status?: string | null;
    selected_builder_id?: string | null;
    agreement_completed?: boolean | null;
    agreement_status?: string | null;
  },
  progress: { checklistCompleted: boolean; agreementSigned?: boolean },
  nowMs = Date.now(),
): boolean {
  if (!project.selected_builder_id) return false;
  if (project.status === 'cancelled' || project.status === 'expired') return false;
  if (project.agreement_completed === true) return false;
  if (isAgreementComplete(project)) return false;
  if (progress.checklistCompleted) return false;
  if (progress.agreementSigned) return false;
  const started = timestampMillis(selectionStartedAt(project));
  return started > 0 && nowMs - started >= UNSIGNED_AGREEMENT_WINDOW_MS;
}
