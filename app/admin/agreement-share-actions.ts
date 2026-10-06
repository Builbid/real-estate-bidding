'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { loadAgreementDraft, type AgreementDraft } from '@/lib/admin/agreementDraft';
import { tradeLabelFor } from '@/lib/admin/siteMeasurements';
import { checklistAgreementRows, soilLabel } from '@/lib/admin/siteVisit';
import { isMissingWorkflowTable, SITE_VISIT_TABLE_MISSING_MESSAGE } from '@/lib/admin/siteVisitStore';
import type { SharedAgreementSnapshot } from '@/lib/admin/sharedAgreement';
import { projectTerritoryError } from '@/lib/admin/territory';
import { parseIndianDateToIso } from '@/lib/projectStartTime';
import { generateProjectDocumentPdfBytes } from '@/lib/documents/pdf';
import { publishAgreementPackage } from '@/lib/documents/publishAgreementPackage';
import { generateQualityControlPdfBytes } from '@/lib/contract/qualityControlPdf';
import { graceDaysForService, graceExtensionLabel } from '@/lib/contract/agreementTerms';
import { generateDigitalContractPdf, overlayFromRecord } from '@/lib/contract/renderDigitalContract';
import { formatBuilbidPublicId } from '@/lib/contract/agreementPdf';
import { isMissingDocumentTable } from '@/lib/documents/documentTables';

const AGREEMENT_SHARE_SUCCESS =
  'Agreement and Quality Control Form successfully sent to both accounts!';

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
function dmy(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

/** Checklist PDF routed to both accounts under their BuilBid IDs. */
function siteChecklistPdf(draft: AgreementDraft): Uint8Array | null {
  const visit = draft.visit;
  if (!visit) return null;
  const rows = [
    { label: 'Homeowner BuilBid ID', value: draft.client.accountId },
    { label: 'Worker BuilBid ID', value: draft.contractor.platformId },
    ...checklistAgreementRows(visit),
    ...(Array.isArray(visit.lineItems) ? visit.lineItems : []).map((line) => ({
      label: line.group ? `${line.group} - ${line.label}` : line.label,
      value: `${line.quantity} ${line.unit} x Rs. ${Math.round(line.rate).toLocaleString('en-IN')} = Rs. ${Math.round(line.amount).toLocaleString('en-IN')}`,
    })),
  ];
  if (visit.totalAccurateCost != null && visit.totalAccurateCost > 0) {
    rows.push({
      label: 'Total Accurate Cost',
      value: `Rs. ${Math.round(visit.totalAccurateCost).toLocaleString('en-IN')}`,
    });
  }
  if (rows.length <= 2) return null;
  return generateProjectDocumentPdfBytes({
    title: 'Site Visit Checklist',
    subtitle: 'Measured site record shared to both BuilBid accounts',
    numericProjectId: draft.project.publicId || draft.project.id,
    projectName: draft.project.title,
    notice: 'This checklist is linked to the homeowner and worker BuilBid IDs on this project.',
    rows,
  });
}

async function partyMatchesAccount(
  admin: ReturnType<typeof createAdminClient>,
  raw: string,
  expectedUserId: string,
  label: string,
): Promise<{ error?: string }> {
  const entered = raw.trim().toLowerCase();
  if (!entered) return { error: `Enter ${label}'s account ID.` };
  const { data } = await admin.from('profiles').select('id, email').eq('id', expectedUserId).maybeSingle();
  if (!data) return { error: `${label}'s account was not found on this project.` };
  const email = String(data.email ?? '').trim().toLowerCase();
  const id = String(data.id).toLowerCase();
  const publicId = formatBuilbidPublicId(data.id).toLowerCase();
  if (entered === id || entered === publicId || entered === publicId.replace(/^bb-/, '') || (email && entered === email)) {
    return {};
  }
  return {
    error: `${label} must be this project's account ID (${formatBuilbidPublicId(data.id)}).`,
  };
}

export async function shareAgreementCopyAction(
  projectRef: string,
  input: { startDate?: string; completionDate?: string; partyA?: string; partyB?: string },
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

  const partyA = (input.partyA ?? draft.client.email).trim();
  const partyB = (input.partyB ?? draft.contractor.email).trim();
  const ownerMatch = await partyMatchesAccount(admin, partyA, draft.project.ownerId, 'Party A');
  if (ownerMatch.error) return { error: ownerMatch.error };
  const workerMatch = await partyMatchesAccount(admin, partyB, draft.project.builderId, 'Party B');
  if (workerMatch.error) return { error: workerMatch.error };

  let agreementBytes: Uint8Array;
  try {
    if (draft.contract) {
      const generated = await generateDigitalContractPdf(
        draft.project.id,
        overlayFromRecord(draft.contract, draft.contract.approved_at ? 'signed' : 'draft'),
      );
      agreementBytes = generated.bytes;
    } else {
      agreementBytes = generateProjectDocumentPdfBytes({
        title: 'Digital Agreement',
        subtitle: 'Section 4 — Timelines, Delays & Penalty Terms',
        numericProjectId: draft.project.publicId || draft.project.id,
        projectName: draft.project.title,
        notice: 'Aadhaar OTP eSign is completed on the agreement page. This copy is shared to both accounts.',
        rows: [
          { label: 'Party A — Homeowner', value: draft.client.name },
          { label: 'Party B — Mistri / Worker', value: draft.contractor.name },
          { label: 'Agreed start date', value: dmy(startDate) },
          { label: 'Target completion date', value: dmy(completionDate) },
          { label: 'Grace extension', value: graceExtensionLabel(graceDaysForService(draft.project.serviceType, draft.project.isMistriCivil)) },
          {
            label: 'Agreed project cost',
            value:
              draft.defaults.totalCost != null
                ? `Rs. ${draft.defaults.totalCost.toLocaleString('en-IN')}`
                : '—',
          },
        ],
      });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not build the agreement PDF.' };
  }

  const qualityControlBytes = generateQualityControlPdfBytes({
    serviceType: draft.project.serviceType,
    projectName: draft.project.title,
    numericProjectId: draft.project.publicId,
    ownerName: draft.client.name,
    workerName: draft.contractor.name,
  });
  const published = await publishAgreementPackage({
    admin,
    projectId: draft.project.id,
    numericId: draft.project.publicId,
    projectName: draft.project.title,
    ownerId: draft.project.ownerId,
    workerId: draft.project.builderId,
    agreementBytes,
    qualityControlBytes,
    checklistBytes: siteChecklistPdf(draft),
  });
  if (published.error) return { error: published.error };

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
    ...(published.fallbackDocuments?.length
      ? { routedDocuments: published.fallbackDocuments }
      : {}),
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
    const documentsAlreadyRouted = !published.fallbackDocuments?.length;
    if (documentsAlreadyRouted && isMissingDocumentTable(error.message)) {
      // Agreement and QC rows are already on the document table. The share log is optional.
    } else {
      if (isMissingWorkflowTable(error)) return { error: SITE_VISIT_TABLE_MISSING_MESSAGE };
      return { error: error.message };
    }
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
  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard/profile/documents');
  revalidatePath(`/admin/agreement/${draft.project.id}`);
  return {
    ok: true,
    sharedAt: now,
    message: AGREEMENT_SHARE_SUCCESS,
  };
}
