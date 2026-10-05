'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { loadAgreementDraft } from '@/lib/admin/agreementDraft';
import { tradeLabelFor } from '@/lib/admin/siteMeasurements';
import { soilLabel } from '@/lib/admin/siteVisit';
import { isMissingWorkflowTable, SITE_VISIT_TABLE_MISSING_MESSAGE } from '@/lib/admin/siteVisitStore';
import type { SharedAgreementSnapshot } from '@/lib/admin/sharedAgreement';
import { projectTerritoryError } from '@/lib/admin/territory';
import { parseIndianDateToIso } from '@/lib/projectStartTime';

function toIsoDate(raw: string | undefined): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return parseIndianDateToIso(trimmed) || null;
}

/**
 * One-touch "Share Agreement Copy": freezes the confirmed agreement (itemised measured rates,
 * total cost, dates) and reflects it in BOTH the Home Owner's and the Mistri / Worker's account,
 * notifying each of them.
 */
export async function shareAgreementCopyAction(
  projectRef: string,
  input: { startDate?: string; completionDate?: string },
): Promise<{ error?: string; ok?: boolean; message?: string; sharedAt?: string }> {
  const session = await requireOfficialAdmin();
  const admin = createAdminClient();

  const draft = await loadAgreementDraft(admin, projectRef);
  if ('error' in draft) return { error: draft.error };
  const territoryError = await projectTerritoryError(admin, session, draft.project.id);
  if (territoryError) return { error: territoryError };

  const contract = draft.contract;
  const startDate = contract
    ? String(contract.start_date).slice(0, 10)
    : toIsoDate(input.startDate);
  const completionDate = contract
    ? String(contract.completion_date).slice(0, 10)
    : toIsoDate(input.completionDate);
  if (!startDate || !completionDate) {
    return { error: 'Confirm the start date and target completion date before sharing the agreement.' };
  }
  if (completionDate < startDate) {
    return { error: 'Target completion date must be on or after the start date.' };
  }
  if (draft.contract?.approved_at == null && draft.defaults.totalCost == null) {
    return { error: 'The agreement total cost is missing.' };
  }

  const visit = draft.visit;
  const signatureStatus: SharedAgreementSnapshot['signatureStatus'] = contract
    ? (contract.status as SharedAgreementSnapshot['signatureStatus'])
    : 'draft';

  const snapshot: SharedAgreementSnapshot = {
    projectTitle: draft.project.title,
    projectPublicId: draft.project.publicId,
    location: `${draft.project.district}, ${draft.project.state}`,
    tradeLabel: tradeLabelFor(draft.project.serviceType),
    ownerName: draft.client.name,
    workerName: draft.contractor.name,
    startDate,
    completionDate,
    plinthAreaSqft: draft.defaults.plinthAreaSqft,
    floors: null,
    soilLabel: visit ? soilLabel(visit.soilType) : null,
    siteVisitDate: visit?.visitDate ?? null,
    facilities: [],
    lineItems: visit?.lineItems ?? [],
    totalCost: draft.defaults.totalCost,
    signatureStatus,
    approved: Boolean(contract?.approved_at),
  };

  const now = new Date().toISOString();
  const { error } = await admin.from('shared_agreements').upsert(
    {
      project_id: draft.project.id,
      owner_id: draft.project.ownerId,
      worker_id: draft.project.builderId,
      shared_by: session.userId,
      snapshot,
      shared_at: now,
      updated_at: now,
    },
    { onConflict: 'project_id' },
  );
  if (error) {
    if (isMissingWorkflowTable(error)) return { error: SITE_VISIT_TABLE_MISSING_MESSAGE };
    return { error: error.message };
  }

  // Best-effort in-app notifications for both parties (never blocks the share).
  try {
    const cost =
      snapshot.totalCost != null ? ` Agreed cost: ₹${snapshot.totalCost.toLocaleString('en-IN')}.` : '';
    const data = { project_id: draft.project.id, project_title: draft.project.title };
    await admin.from('notifications').insert([
      {
        user_id: draft.project.ownerId,
        type: 'agreement_shared',
        title: 'Agreement copy shared',
        body: `The supervisor shared the agreement for "${draft.project.title}" with you and your worker.${cost}`,
        data,
      },
      {
        user_id: draft.project.builderId,
        type: 'agreement_shared',
        title: 'Agreement copy shared',
        body: `The supervisor shared the agreement for "${draft.project.title}" with you and the project owner.${cost}`,
        data,
      },
    ]);
  } catch {
    // ignore notification failures
  }

  revalidatePath('/dashboard/owner');
  revalidatePath('/dashboard/builder');
  revalidatePath(`/admin/agreement/${draft.project.id}`);
  return {
    ok: true,
    sharedAt: now,
    message: `Agreement copy shared with ${draft.client.name} (Home Owner) and ${draft.contractor.name} (Mistri / Worker).`,
  };
}
