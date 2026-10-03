'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  hashValue,
  isMissingDigitalContractTable,
  makeSignatureRef,
  safeEqualHash,
  type DigitalContractParty,
  type DigitalContractRecord,
} from '@/lib/contract/renderDigitalContract';
import { finalizeApprovedAgreement } from '@/lib/admin/agreementPackage';
import { maskAadhaarLast4 } from '@/lib/contract/aadhaar';

export interface EsignSessionView {
  projectTitle: string;
  partyRole: DigitalContractParty;
  partyName: string;
  aadhaarMasked: string;
  alreadySigned: boolean;
  bothSigned: boolean;
  summary: Record<string, string>;
}

export async function loadEsignSession(
  token: string,
): Promise<{ error?: string; session?: EsignSessionView }> {
  const trimmed = token.trim();
  if (!trimmed) return { error: 'Invalid eSign link.' };

  const admin = createAdminClient();
  const byClient = await admin
    .from('project_digital_contracts')
    .select('*')
    .eq('client_token', trimmed)
    .maybeSingle();
  const byContractor =
    byClient.data
      ? byClient
      : await admin
          .from('project_digital_contracts')
          .select('*')
          .eq('contractor_token', trimmed)
          .maybeSingle();
  const error = byClient.error || byContractor.error;
  const data = byClient.data || byContractor.data;

  if (error) {
    if (isMissingDigitalContractTable(error)) {
      return { error: 'Digital contract storage is not available yet.' };
    }
    return { error: error.message };
  }
  if (!data) return { error: 'This eSign link is invalid or has expired.' };

  const record = data as DigitalContractRecord;
  const partyRole: DigitalContractParty =
    record.client_token === trimmed ? 'client' : 'contractor';
  const alreadySigned =
    partyRole === 'client' ? Boolean(record.client_verified_at) : Boolean(record.contractor_verified_at);

  const { data: project } = await admin
    .from('projects')
    .select('title')
    .eq('id', record.project_id)
    .maybeSingle();

  return {
    session: {
      projectTitle: project?.title || 'BuilBid Contract Agreement',
      partyRole,
      partyName: partyRole === 'client' ? record.client_name : record.contractor_name,
      aadhaarMasked: maskAadhaarLast4(
        partyRole === 'client' ? record.client_aadhaar_last4 : record.contractor_aadhaar_last4,
      ),
      alreadySigned,
      bothSigned: record.status === 'signed',
      summary: {
        Project: project?.title || 'BuilBid Contract Agreement',
        'Approximate Plinth Area': `${Number(record.plinth_area_sqft).toLocaleString('en-IN')} sq. ft.`,
        'Start Date': String(record.start_date).slice(0, 10).split('-').reverse().join('/'),
        'Target Completion Date': String(record.completion_date).slice(0, 10).split('-').reverse().join('/'),
        'Total Agreed Project Cost': `₹${Number(record.total_agreed_cost).toLocaleString('en-IN')}`,
        'Client': record.client_name,
        'Contractor': record.contractor_name,
      },
    },
  };
}

export async function verifyDigitalContractOtpAction(
  token: string,
  otp: string,
): Promise<{ error?: string; ok?: boolean; bothSigned?: boolean; message?: string }> {
  const trimmedToken = token.trim();
  const code = otp.replace(/\D/g, '').slice(0, 6);
  if (!trimmedToken) return { error: 'Invalid eSign link.' };
  if (!/^\d{6}$/.test(code)) return { error: 'Enter the 6-digit OTP from your email.' };

  const admin = createAdminClient();
  const byClient = await admin
    .from('project_digital_contracts')
    .select('*')
    .eq('client_token', trimmedToken)
    .maybeSingle();
  const byContractor =
    byClient.data
      ? byClient
      : await admin
          .from('project_digital_contracts')
          .select('*')
          .eq('contractor_token', trimmedToken)
          .maybeSingle();
  const error = byClient.error || byContractor.error;
  const data = byClient.data || byContractor.data;

  if (error) {
    if (isMissingDigitalContractTable(error)) {
      return { error: 'Digital contract storage is not available yet.' };
    }
    return { error: error.message };
  }
  if (!data) return { error: 'This eSign link is invalid or has been replaced.' };

  const record = data as DigitalContractRecord;
  const party: DigitalContractParty =
    record.client_token === trimmedToken ? 'client' : 'contractor';
  const storedHash = party === 'client' ? record.client_otp_hash : record.contractor_otp_hash;
  const already =
    party === 'client' ? Boolean(record.client_verified_at) : Boolean(record.contractor_verified_at);

  if (already) {
    return { ok: true, bothSigned: record.status === 'signed', message: 'You have already signed this agreement.' };
  }

  if (new Date(record.otp_expires_at).getTime() < Date.now()) {
    return { error: 'This OTP has expired. Ask BuilBid admin to resend the contract.' };
  }

  if (!safeEqualHash(storedHash, hashValue(code))) {
    return { error: 'Incorrect OTP. Check the code emailed to your registered address.' };
  }

  const nowIso = new Date().toISOString();
  const signatureRef = makeSignatureRef(`${record.id}|${party}|${nowIso}`);
  const patch =
    party === 'client'
      ? { client_verified_at: nowIso, client_signature_ref: signatureRef }
      : { contractor_verified_at: nowIso, contractor_signature_ref: signatureRef };

  const clientDone = party === 'client' ? true : Boolean(record.client_verified_at);
  const contractorDone = party === 'contractor' ? true : Boolean(record.contractor_verified_at);
  const bothSigned = clientDone && contractorDone;

  const { data: updated, error: updateError } = await admin
    .from('project_digital_contracts')
    .update({
      ...patch,
      status: bothSigned ? 'signed' : 'partially_signed',
      signed_at: bothSigned ? nowIso : null,
      updated_at: nowIso,
    })
    .eq('id', record.id)
    .select('*')
    .maybeSingle();

  if (updateError || !updated) {
    return { error: updateError?.message || 'Could not save your eSign.' };
  }

  if (bothSigned) {
    const signed = updated as DigitalContractRecord;
    const result = await finalizeApprovedAgreement(signed);
    revalidatePath('/admin/dashboard');
    revalidatePath(`/admin/agreement/${signed.project_id}`);
    if (!result.approved) {
      return {
        ok: true,
        bothSigned: true,
        message: `Signed successfully, but final approval is pending: ${result.warning ?? 'dispatch failed'}. The supervisor can retry the final dispatch from the agreement page.`,
      };
    }
    return {
      ok: true,
      bothSigned: true,
      message:
        'Aadhaar eSign complete. The agreement is Approved / Active and the signed PDFs have been emailed to the Home Owner and the Mistri.',
    };
  }

  return {
    ok: true,
    bothSigned: false,
    message: 'Your Aadhaar eSign is recorded. Waiting for the other party to verify their OTP.',
  };
}
