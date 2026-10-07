'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { loadAgreementDraft } from '@/lib/admin/agreementDraft';
import { projectTerritoryError } from '@/lib/admin/territory';
import { PROTOTYPE_AUTO_AGREEMENT } from '@/lib/admin/prototype';
import { isValidAadhaarNumber, aadhaarLast4, digitsOnlyAadhaar } from '@/lib/contract/aadhaar';
import { finalizeApprovedAgreement, markProjectAgreementComplete } from '@/lib/admin/agreementPackage';
import {
  DIGITAL_CONTRACT_OTP_TTL_MS,
  generateDigitalContractPdf,
  generateEsignToken,
  generateOtpCode,
  hashValue,
  isMissingDigitalContractTable,
  makeSignatureRef,
  overlayFromFields,
  esignUrl,
  safeEqualHash,
  type DigitalContractFields,
  type DigitalContractParty,
  type DigitalContractRecord,
} from '@/lib/contract/renderDigitalContract';
import { sendDigitalContractDraftEmails } from '@/lib/email/sendDigitalContract';
import { parseIndianDateToIso } from '@/lib/projectStartTime';
import {
  extractProjectIdFromRecord,
  findProjectByAnyId,
} from '@/lib/contract/resolveProjectId';

export interface CreateDigitalContractInput {
  projectId?: string;
  id?: string;
  project_id?: string;
  numeric_id?: string;
  plinthArea: string;
  startDate: string;
  completionDate: string;
  totalCost: string;
  clientAadhaar: string;
  contractorAadhaar: string;
}

function parsePositiveNumber(raw: string, label: string): number | { error: string } {
  const value = Number(String(raw).replace(/,/g, '').trim());
  if (!Number.isFinite(value) || value <= 0) {
    return { error: `Enter a valid ${label}.` };
  }
  return value;
}

function asIsoDate(raw: string, label: string): string | { error: string } {
  const trimmed = raw.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : parseIndianDateToIso(trimmed);
  if (!iso) return { error: `${label} must be a valid date (DD/MM/YYYY).` };
  return iso;
}

export async function sendContractAgreementForSignatureAction(
  input: CreateDigitalContractInput,
): Promise<{ error?: string; ok?: boolean; message?: string }> {
  const session = await requireOfficialAdmin();

  const requestedId = extractProjectIdFromRecord({
    projectId: input.projectId,
    id: input.id,
    project_id: input.project_id,
    numeric_id: input.numeric_id,
  });
  if (!requestedId) {
    console.error(
      '[CreateContractAgreement] eSign blocked: projectId/id/project_id missing from payload.',
      {
        hasProjectId: Boolean(input.projectId),
        hasId: Boolean(input.id),
        hasProject_id: Boolean(input.project_id),
      },
    );
    return {
      error:
        'Project is missing. Close this dialog and reopen Create Contract Agreement from the project row.',
    };
  }

  const supervisorSession = !isOfficialAdminEmail(session.email);

  // Supervisors must have completed the Site Visit Checklist; the measured plinth area wins.
  // The agreed cost also comes from the accepted bid, because the supervisor's 0.2% commission
  // is calculated from it and must not be editable by the supervisor.
  let plinthInput = input.plinthArea;
  let costInput = input.totalCost;
  if (supervisorSession) {
    const lookup = createAdminClient();
    const draft = await loadAgreementDraft(lookup, requestedId);
    if ('error' in draft) return { error: draft.error };
    const territoryError = await projectTerritoryError(lookup, session, draft.project.id);
    if (territoryError) return { error: territoryError };
    if (!draft.visit && !PROTOTYPE_AUTO_AGREEMENT) {
      return { error: 'Complete and save the Site Visit Checklist before sending the agreement.' };
    }
    if (draft.defaults.totalCost == null) {
      return { error: 'The accepted bid amount is missing for this project.' };
    }
    // Prototype testing: without a checklist the plinth area typed on the agreement page is used.
    if (draft.visit && draft.visit.plinthAreaSqft > 0) plinthInput = String(draft.visit.plinthAreaSqft);
    // Derived server-side: the supervisor's measured "Total Accurate Cost" (measured quantity x
    // agreed rates) when a checklist is saved, otherwise the accepted bid amount.
    costInput = String(draft.defaults.totalCost);
  }

  const plinthArea = parsePositiveNumber(plinthInput, 'Approximate Plinth Area');
  if (typeof plinthArea !== 'number') return plinthArea;
  const totalCost = parsePositiveNumber(costInput, 'Total Agreed Project Cost');
  if (typeof totalCost !== 'number') return totalCost;
  const startDate = asIsoDate(input.startDate, 'Start Date');
  if (typeof startDate !== 'string') return startDate;
  const completionDate = asIsoDate(input.completionDate, 'Target Project Completion Date');
  if (typeof completionDate !== 'string') return completionDate;
  if (completionDate < startDate) {
    return { error: 'Target completion date must be on or after the start date.' };
  }
  if (!isValidAadhaarNumber(input.clientAadhaar)) {
    return { error: 'Enter a valid 12-digit Client / Homeowner Aadhaar number.' };
  }
  if (!isValidAadhaarNumber(input.contractorAadhaar)) {
    return { error: 'Enter a valid 12-digit Contractor / Mistri Aadhaar number.' };
  }
  if (digitsOnlyAadhaar(input.clientAadhaar) === digitsOnlyAadhaar(input.contractorAadhaar)) {
    return { error: 'Client and Contractor Aadhaar numbers must be different.' };
  }

  const admin = createAdminClient();
  const { data: project, errorMessage } = await findProjectByAnyId<{
    id: string;
    owner_id: string;
    selected_builder_id: string | null;
    title: string;
  }>(admin, requestedId, 'id, owner_id, selected_builder_id, title');

  if (!project) {
    console.error('[CreateContractAgreement] Project lookup failed.', {
      requestedId,
      errorMessage,
    });
    return { error: 'Project not found.' };
  }
  const projectId = project.id;
  if (!project.selected_builder_id) {
    return { error: 'Create a contract only after a bidder / contractor has been finalized.' };
  }

  const [{ data: ownerRow }, { data: contractorRow }] = await Promise.all([
    admin.from('profiles').select('full_name, email').eq('id', project.owner_id).maybeSingle(),
    admin
      .from('profiles')
      .select('full_name, email, company_name')
      .eq('id', project.selected_builder_id)
      .maybeSingle(),
  ]);

  const clientEmail = ownerRow?.email?.trim();
  const contractorEmail = contractorRow?.email?.trim();
  if (!clientEmail) return { error: 'The client does not have a registered email.' };
  if (!contractorEmail) return { error: 'The contractor does not have a registered email.' };

  const clientName = ownerRow?.full_name?.trim() || 'Homeowner';
  const contractorName =
    contractorRow?.company_name?.trim() || contractorRow?.full_name?.trim() || 'Contractor';

  const clientOtp = generateOtpCode();
  const contractorOtp = generateOtpCode();
  const clientToken = generateEsignToken();
  const contractorToken = generateEsignToken();
  const now = new Date();
  const otpExpires = new Date(now.getTime() + DIGITAL_CONTRACT_OTP_TTL_MS).toISOString();

  const fields: DigitalContractFields = {
    plinthAreaSqft: plinthArea,
    startDate,
    completionDate,
    totalAgreedCost: totalCost,
  };

  // An approved agreement is final; re-sending would reset signatures and double-credit logic.
  const existing = await admin
    .from('project_digital_contracts')
    .select('approved_at')
    .eq('project_id', projectId)
    .maybeSingle();
  const approvalColumnsReady = !existing.error;
  if (existing.data?.approved_at) {
    return { error: 'This agreement is already signed and approved. It cannot be re-sent.' };
  }

  const row = {
    ...(approvalColumnsReady ? { approved_at: null, dispatched_at: null } : {}),
    project_id: projectId,
    plinth_area_sqft: plinthArea,
    start_date: startDate,
    completion_date: completionDate,
    total_agreed_cost: totalCost,
    client_email: clientEmail,
    contractor_email: contractorEmail,
    client_name: clientName,
    contractor_name: contractorName,
    client_aadhaar_hash: hashValue(digitsOnlyAadhaar(input.clientAadhaar)),
    contractor_aadhaar_hash: hashValue(digitsOnlyAadhaar(input.contractorAadhaar)),
    client_aadhaar_last4: aadhaarLast4(input.clientAadhaar),
    contractor_aadhaar_last4: aadhaarLast4(input.contractorAadhaar),
    client_token: clientToken,
    contractor_token: contractorToken,
    client_otp_hash: hashValue(clientOtp),
    contractor_otp_hash: hashValue(contractorOtp),
    otp_expires_at: otpExpires,
    client_verified_at: null,
    contractor_verified_at: null,
    client_signature_ref: null,
    contractor_signature_ref: null,
    status: 'pending_esign',
    created_by: session.userId,
    updated_at: now.toISOString(),
    signed_at: null,
  };

  const { error: upsertError } = await admin.from('project_digital_contracts').upsert(row, {
    onConflict: 'project_id',
  });

  if (upsertError) {
    if (isMissingDigitalContractTable(upsertError)) {
      return {
        error:
          'Database table missing. Run supabase/migrations/047_project_digital_contracts.sql in the Supabase SQL Editor, then retry.',
      };
    }
    return { error: upsertError.message };
  }

  try {
    const overlay = overlayFromFields(fields);
    const generated = await generateDigitalContractPdf(projectId, overlay);
    await sendDigitalContractDraftEmails({
      clientEmail,
      contractorEmail,
      clientName,
      contractorName,
      clientOtp,
      contractorOtp,
      clientUrl: esignUrl(clientToken),
      contractorUrl: esignUrl(contractorToken),
      summary: generated.summary,
      pdfBytes: generated.bytes,
      filename: generated.filename,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send contract emails.';
    return { error: message };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/agreement/${projectId}`);
  return {
    ok: true,
    message: `Draft agreement and Aadhaar eSign OTPs sent to ${clientEmail} and ${contractorEmail}.`,
  };
}

/** Verifies one party's emailed Aadhaar OTP from the agreement page. Both verifications approve the contract. */
export async function verifyEmbeddedAgreementOtpAction(
  projectRef: string,
  party: DigitalContractParty,
  otp: string,
): Promise<{ error?: string; ok?: boolean; bothSigned?: boolean; message?: string }> {
  const session = await requireOfficialAdmin();
  const code = otp.replace(/\D/g, '').slice(0, 6);
  if (!/^\d{6}$/.test(code)) return { error: 'Enter the 6-digit OTP from the registered email.' };

  const admin = createAdminClient();
  const draft = await loadAgreementDraft(admin, projectRef);
  if ('error' in draft) return { error: draft.error };
  const territoryError = await projectTerritoryError(admin, session, draft.project.id);
  if (territoryError && !isOfficialAdminEmail(session.email)) return { error: territoryError };

  const { data, error } = await admin
    .from('project_digital_contracts')
    .select('*')
    .eq('project_id', draft.project.id)
    .maybeSingle();
  if (error) {
    if (isMissingDigitalContractTable(error)) return { error: 'Digital contract storage is not available yet.' };
    return { error: error.message };
  }
  if (!data) return { error: 'Send the Aadhaar OTPs before verifying.' };

  const record = data as DigitalContractRecord;
  if (record.approved_at) {
    return { ok: true, bothSigned: true, message: 'This agreement is already Approved / Active.' };
  }

  const storedHash = party === 'client' ? record.client_otp_hash : record.contractor_otp_hash;
  const already = party === 'client' ? Boolean(record.client_verified_at) : Boolean(record.contractor_verified_at);
  if (already) {
    return { ok: true, bothSigned: record.status === 'signed', message: 'This party has already verified their OTP.' };
  }
  if (new Date(record.otp_expires_at).getTime() < Date.now()) {
    return { error: 'This OTP has expired. Send the Aadhaar OTPs again.' };
  }
  if (!safeEqualHash(storedHash, hashValue(code))) {
    return { error: 'Incorrect OTP. Use the code sent to that party\'s registered email.' };
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
  if (updateError || !updated) return { error: updateError?.message || 'Could not save this eSign.' };

  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/agreement/${draft.project.id}`);

  if (!bothSigned) {
    return { ok: true, bothSigned: false, message: 'OTP verified. Waiting for the other party.' };
  }

  const result = await finalizeApprovedAgreement(updated as DigitalContractRecord);
  if (!result.approved) {
    return {
      ok: true,
      bothSigned: true,
      message: `Both OTPs are verified, but final approval is pending: ${result.warning ?? 'dispatch failed'}.`,
    };
  }
  return {
    ok: true,
    bothSigned: true,
    message: 'Both Aadhaar OTPs are verified. The agreement is Approved / Active.',
  };
}

/**
 * Prototype testing eSign. Any 12-digit Aadhaar and any 6-digit OTP verify that party.
 * When both parties are verified, the agreement is marked Approved / Active.
 */
export async function verifyPrototypeEsignAction(input: {
  projectId: string;
  party: DigitalContractParty;
  aadhaar: string;
  otp: string;
}): Promise<{ error?: string; ok?: boolean; bothSigned?: boolean; message?: string }> {
  if (!PROTOTYPE_AUTO_AGREEMENT) {
    return { error: 'Prototype eSign is turned off.' };
  }
  const session = await requireOfficialAdmin();
  const aadhaar = digitsOnlyAadhaar(input.aadhaar);
  const otp = input.otp.replace(/\D/g, '').slice(0, 6);
  if (!/^\d{12}$/.test(aadhaar)) return { error: 'Enter a 12-digit Aadhaar number.' };
  if (!/^\d{6}$/.test(otp)) return { error: 'Enter a 6-digit OTP.' };

  const admin = createAdminClient();
  const draft = await loadAgreementDraft(admin, input.projectId);
  if ('error' in draft) return { error: draft.error };
  const territoryError = await projectTerritoryError(admin, session, draft.project.id);
  if (territoryError && !isOfficialAdminEmail(session.email)) return { error: territoryError };
  if (!draft.client.email || !draft.contractor.email) {
    return { error: 'Both parties need a registered email before eSign.' };
  }

  const { data, error } = await admin
    .from('project_digital_contracts')
    .select('*')
    .eq('project_id', draft.project.id)
    .maybeSingle();
  if (error) {
    if (isMissingDigitalContractTable(error)) return { error: 'Digital contract storage is not available yet.' };
    return { error: error.message };
  }

  const existing = (data as DigitalContractRecord | null) ?? null;
  if (existing?.approved_at) {
    return { ok: true, bothSigned: true, message: 'This agreement is already Approved / Active.' };
  }

  const nowIso = new Date().toISOString();
  const aadhaarHash = hashValue(aadhaar);
  const otherHash = existing
    ? input.party === 'client'
      ? existing.contractor_aadhaar_hash
      : existing.client_aadhaar_hash
    : null;
  const otherVerified = existing
    ? input.party === 'client'
      ? Boolean(existing.contractor_verified_at)
      : Boolean(existing.client_verified_at)
    : false;
  if (otherVerified && otherHash && otherHash === aadhaarHash) {
    return { error: 'Homeowner and worker Aadhaar numbers must be different.' };
  }

  const already = existing
    ? input.party === 'client'
      ? Boolean(existing.client_verified_at)
      : Boolean(existing.contractor_verified_at)
    : false;
  if (already) {
    const both = Boolean(existing?.client_verified_at && existing?.contractor_verified_at);
    return {
      ok: true,
      bothSigned: both,
      message: both ? 'This agreement is already Approved / Active.' : 'This party is already verified.',
    };
  }

  const signatureRef = makeSignatureRef(`${draft.project.id}|${input.party}|${nowIso}|prototype`);
  const partyPatch =
    input.party === 'client'
      ? {
          client_aadhaar_hash: aadhaarHash,
          client_aadhaar_last4: aadhaarLast4(aadhaar),
          client_otp_hash: hashValue(otp),
          client_verified_at: nowIso,
          client_signature_ref: signatureRef,
        }
      : {
          contractor_aadhaar_hash: aadhaarHash,
          contractor_aadhaar_last4: aadhaarLast4(aadhaar),
          contractor_otp_hash: hashValue(otp),
          contractor_verified_at: nowIso,
          contractor_signature_ref: signatureRef,
        };

  const clientDone = input.party === 'client' ? true : Boolean(existing?.client_verified_at);
  const contractorDone = input.party === 'contractor' ? true : Boolean(existing?.contractor_verified_at);
  const bothSigned = clientDone && contractorDone;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const startDate = draft.defaults.startDate || today;
  const completionDate = draft.defaults.completionDate || startDate;
  const plinth =
    draft.defaults.plinthAreaSqft && draft.defaults.plinthAreaSqft > 0 ? draft.defaults.plinthAreaSqft : 1;
  const cost = draft.defaults.totalCost && draft.defaults.totalCost > 0 ? draft.defaults.totalCost : 1;

  const statusPatch = {
    status: bothSigned ? 'signed' : 'partially_signed',
    signed_at: bothSigned ? nowIso : null,
    updated_at: nowIso,
  };

  const savedResult = existing
    ? await admin
        .from('project_digital_contracts')
        .update({ ...partyPatch, ...statusPatch })
        .eq('id', existing.id)
        .select('*')
        .maybeSingle()
    : await admin
        .from('project_digital_contracts')
        .insert({
          project_id: draft.project.id,
          plinth_area_sqft: plinth,
          start_date: startDate,
          completion_date: completionDate,
          total_agreed_cost: cost,
          client_email: draft.client.email,
          contractor_email: draft.contractor.email,
          client_name: draft.client.name,
          contractor_name: draft.contractor.name,
          client_token: generateEsignToken(),
          contractor_token: generateEsignToken(),
          otp_expires_at: new Date(Date.now() + DIGITAL_CONTRACT_OTP_TTL_MS).toISOString(),
          client_aadhaar_hash:
            input.party === 'client' ? aadhaarHash : hashValue(`pending-client-${draft.project.id}`),
          contractor_aadhaar_hash:
            input.party === 'contractor' ? aadhaarHash : hashValue(`pending-contractor-${draft.project.id}`),
          client_aadhaar_last4: input.party === 'client' ? aadhaarLast4(aadhaar) : '0000',
          contractor_aadhaar_last4: input.party === 'contractor' ? aadhaarLast4(aadhaar) : '0000',
          client_otp_hash: input.party === 'client' ? hashValue(otp) : hashValue(`pending-client-${draft.project.id}`),
          contractor_otp_hash:
            input.party === 'contractor' ? hashValue(otp) : hashValue(`pending-contractor-${draft.project.id}`),
          client_verified_at: input.party === 'client' ? nowIso : null,
          contractor_verified_at: input.party === 'contractor' ? nowIso : null,
          client_signature_ref: input.party === 'client' ? signatureRef : null,
          contractor_signature_ref: input.party === 'contractor' ? signatureRef : null,
          created_by: session.userId,
          ...statusPatch,
        })
        .select('*')
        .maybeSingle();

  if (savedResult.error || !savedResult.data) {
    if (savedResult.error && isMissingDigitalContractTable(savedResult.error)) {
      return { error: 'Digital contract storage is not available yet.' };
    }
    return { error: savedResult.error?.message || 'Could not save this eSign.' };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/agreement/${draft.project.id}`);

  if (!bothSigned) {
    return { ok: true, bothSigned: false, message: 'Verified. Waiting for the other party.' };
  }

  const finalized = await finalizeApprovedAgreement(savedResult.data as DigitalContractRecord);
  if (!finalized.approved) {
    const { error: forceError } = await admin
      .from('project_digital_contracts')
      .update({ approved_at: nowIso, status: 'signed', signed_at: nowIso, updated_at: nowIso })
      .eq('id', (savedResult.data as DigitalContractRecord).id);
    await markProjectAgreementComplete(admin, draft.project.id);
    if (forceError) return { error: forceError.message };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/agreement/${draft.project.id}`);
  return {
    ok: true,
    bothSigned: true,
    message: 'Verified. The agreement is Approved / Active.',
  };
}
