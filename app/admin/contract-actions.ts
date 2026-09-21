'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isValidAadhaarNumber, aadhaarLast4, digitsOnlyAadhaar } from '@/lib/contract/aadhaar';
import {
  DIGITAL_CONTRACT_OTP_TTL_MS,
  generateDigitalContractPdf,
  generateEsignToken,
  generateOtpCode,
  hashValue,
  isMissingDigitalContractTable,
  overlayFromFields,
  esignUrl,
  type DigitalContractFields,
} from '@/lib/contract/renderDigitalContract';
import { sendDigitalContractDraftEmails } from '@/lib/email/sendDigitalContract';
import { parseIndianDateToIso } from '@/lib/projectStartTime';

export interface CreateDigitalContractInput {
  projectId: string;
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

  const projectId = input.projectId?.trim();
  if (!projectId) return { error: 'Project is missing.' };

  const plinthArea = parsePositiveNumber(input.plinthArea, 'Approximate Plinth Area');
  if (typeof plinthArea !== 'number') return plinthArea;
  const totalCost = parsePositiveNumber(input.totalCost, 'Total Agreed Project Cost');
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
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, owner_id, selected_builder_id, title')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !project) return { error: 'Project not found.' };
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

  const row = {
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
  return {
    ok: true,
    message: `Draft agreement and Aadhaar eSign OTPs sent to ${clientEmail} and ${contractorEmail}.`,
  };
}
