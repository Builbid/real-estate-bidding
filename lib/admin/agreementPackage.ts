import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calculateSupervisorCommission,
  isOfficialAdminEmail,
  SUPERVISOR_PAYOUT_BPS,
} from '@/lib/admin/constants';
import {
  generateDigitalContractPdf,
  overlayFromRecord,
  type DigitalContractRecord,
} from '@/lib/contract/renderDigitalContract';
import { sendSignedDigitalContractPdf } from '@/lib/email/sendDigitalContract';

export interface FinalizeResult {
  approved: boolean;
  dispatched: boolean;
  commissionAmount: number | null;
  commissionCredited: boolean;
  warning?: string;
}

async function isSupervisorAccount(
  admin: SupabaseClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await admin
    .from('profiles')
    .select('role, email, is_verified')
    .eq('id', userId)
    .maybeSingle();
  if (!data || isOfficialAdminEmail(data.email)) return false;
  return data.role === 'field_supervisor' || data.role === 'supervisor';
}

function revalidateSupervisorSurfaces(): void {
  try {
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/dashboard/accounts');
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/owner/projects/completed');
  } catch {
    // revalidatePath is only available inside a request.
  }
}

/** Credits the 0.2% commission once per project (unique project_id makes retries safe). */
async function creditSupervisorCommission(
  admin: SupabaseClient,
  contract: DigitalContractRecord,
  actingSupervisorId?: string | null,
): Promise<{ amount: number | null; credited: boolean; warning?: string }> {
  const createdByIsSupervisor = await isSupervisorAccount(admin, contract.created_by);
  const actingIsSupervisor = await isSupervisorAccount(admin, actingSupervisorId);
  const supervisorId = createdByIsSupervisor
    ? contract.created_by
    : actingIsSupervisor
      ? actingSupervisorId
      : null;
  if (!supervisorId) {
    return { amount: null, credited: false };
  }
  const projectValue = Number(contract.total_agreed_cost);
  const amount = calculateSupervisorCommission(projectValue);

  const { error } = await admin.from('supervisor_commissions').upsert(
    {
      project_id: contract.project_id,
      supervisor_id: supervisorId,
      project_value: projectValue,
      commission_bps: SUPERVISOR_PAYOUT_BPS,
      amount,
      status: 'credited',
      credited_at: new Date().toISOString(),
    },
    { onConflict: 'project_id', ignoreDuplicates: true },
  );
  if (error) {
    return {
      amount,
      credited: false,
      warning: `Commission could not be credited: ${error.message}`,
    };
  }

  const { data: existing } = await admin
    .from('supervisor_commissions')
    .select('amount')
    .eq('project_id', contract.project_id)
    .maybeSingle();
  return { amount: existing ? Number(existing.amount) : amount, credited: true };
}

/**
 * Moves a signed agreement into the owner's Completed Projects list.
 * Retries without optional columns when an older database is missing them.
 */
export async function markProjectAgreementComplete(
  admin: SupabaseClient,
  projectId: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const attempts: Record<string, unknown>[] = [
    {
      status: 'completed',
      agreement_completed: true,
      agreement_status: 'approved_active',
      updated_at: nowIso,
    },
    { status: 'completed', agreement_completed: true, updated_at: nowIso },
    { status: 'completed', agreement_status: 'approved_active', updated_at: nowIso },
    { status: 'completed', updated_at: nowIso },
  ];

  for (const patch of attempts) {
    const { error } = await admin.from('projects').update(patch).eq('id', projectId);
    if (!error) {
      revalidateSupervisorSurfaces();
      return;
    }
    const message = error.message ?? '';
    if (!/agreement_completed|agreement_status|column/i.test(message)) {
      console.error('[markProjectAgreementComplete]', message);
      return;
    }
  }
}

/**
 * Runs when both parties have signed:
 *  1. marks the project completed and credits the supervisor's 0.2% commission immediately,
 *  2. then emails the signed PDF. A mail failure does not undo the completion or the balance.
 * Idempotent: a repeat call never credits twice.
 */
export async function finalizeApprovedAgreement(
  signed: DigitalContractRecord,
  actingSupervisorId?: string | null,
): Promise<FinalizeResult> {
  const admin = createAdminClient();
  let contract = signed;
  const nowIso = new Date().toISOString();
  await markProjectAgreementComplete(admin, contract.project_id);

  if (!contract.approved_at) {
    const { data: updated, error: updateError } = await admin
      .from('project_digital_contracts')
      .update({ approved_at: nowIso, status: 'signed', signed_at: contract.signed_at ?? nowIso, updated_at: nowIso })
      .eq('id', contract.id)
      .is('approved_at', null)
      .select('*')
      .maybeSingle();
    if (!updateError && updated) contract = updated as DigitalContractRecord;
    await markProjectAgreementComplete(admin, contract.project_id);
  }

  const commission = await creditSupervisorCommission(admin, contract, actingSupervisorId);
  revalidateSupervisorSurfaces();

  let dispatched = Boolean(contract.dispatched_at);
  let warning = commission.warning;
  if (!contract.dispatched_at) {
    try {
      const pdf = await generateDigitalContractPdf(contract.project_id, overlayFromRecord(contract, 'signed'));
      await sendSignedDigitalContractPdf({
        clientEmail: contract.client_email,
        contractorEmail: contract.contractor_email,
        clientName: contract.client_name,
        contractorName: contract.contractor_name,
        summary: pdf.summary,
        pdfBytes: pdf.bytes,
        filename: pdf.filename,
      });
      dispatched = true;
      await admin
        .from('project_digital_contracts')
        .update({ dispatched_at: nowIso, updated_at: nowIso })
        .eq('id', contract.id);
    } catch (err) {
      const mailWarning = `Signed PDF email failed: ${err instanceof Error ? err.message : 'unknown error'}`;
      warning = warning ? `${warning} ${mailWarning}` : mailWarning;
    }
  }

  return {
    approved: true,
    dispatched,
    commissionAmount: commission.amount,
    commissionCredited: commission.credited,
    warning,
  };
}
