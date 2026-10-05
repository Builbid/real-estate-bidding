import type { SupabaseClient } from '@supabase/supabase-js';
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

/** Credits the 0.2% commission once per project (unique project_id makes retries safe). */
async function creditSupervisorCommission(
  admin: SupabaseClient,
  contract: DigitalContractRecord,
): Promise<{ amount: number | null; credited: boolean; warning?: string }> {
  if (!(await isSupervisorAccount(admin, contract.created_by))) {
    return { amount: null, credited: false };
  }
  const projectValue = Number(contract.total_agreed_cost);
  const amount = calculateSupervisorCommission(projectValue);

  const { error } = await admin.from('supervisor_commissions').upsert(
    {
      project_id: contract.project_id,
      supervisor_id: contract.created_by,
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
 * Runs when both parties have signed:
 *  1. emails the signed two-party agreement PDF to the Home Owner and the Worker,
 *  2. marks the project Approved / Active,
 *  3. credits the supervisor's 0.2% commission.
 * Idempotent: a repeat call never emails twice nor credits twice.
 */
export async function finalizeApprovedAgreement(
  signed: DigitalContractRecord,
): Promise<FinalizeResult> {
  const admin = createAdminClient();
  let contract = signed;

  if (!contract.approved_at) {
    let pdf: Awaited<ReturnType<typeof generateDigitalContractPdf>>;
    try {
      pdf = await generateDigitalContractPdf(contract.project_id, overlayFromRecord(contract, 'signed'));
    } catch (err) {
      return {
        approved: false,
        dispatched: false,
        commissionAmount: null,
        commissionCredited: false,
        warning: err instanceof Error ? err.message : 'Could not generate the signed PDF.',
      };
    }

    try {
      await sendSignedDigitalContractPdf({
        clientEmail: contract.client_email,
        contractorEmail: contract.contractor_email,
        clientName: contract.client_name,
        contractorName: contract.contractor_name,
        summary: pdf.summary,
        pdfBytes: pdf.bytes,
        filename: pdf.filename,
      });
    } catch (err) {
      return {
        approved: false,
        dispatched: false,
        commissionAmount: null,
        commissionCredited: false,
        warning: `Signed PDF email failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      };
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from('project_digital_contracts')
      .update({ dispatched_at: nowIso, approved_at: nowIso, updated_at: nowIso })
      .eq('id', contract.id)
      .is('approved_at', null)
      .select('*')
      .maybeSingle();

    if (updateError) {
      return {
        approved: false,
        dispatched: true,
        commissionAmount: null,
        commissionCredited: false,
        warning: `PDFs were emailed, but approval could not be saved: ${updateError.message}`,
      };
    }
    if (updated) contract = updated as DigitalContractRecord;

    // Project-level "Approved / Active" marker (non-blocking if the column is not migrated).
    const { error: projectError } = await admin
      .from('projects')
      .update({ agreement_status: 'approved_active', updated_at: nowIso })
      .eq('id', contract.project_id);
    if (projectError) {
      console.error('[finalizeApprovedAgreement] projects.agreement_status update failed:', projectError.message);
    }
  }

  const commission = await creditSupervisorCommission(admin, contract);
  return {
    approved: true,
    dispatched: true,
    commissionAmount: commission.amount,
    commissionCredited: commission.credited,
    warning: commission.warning,
  };
}
