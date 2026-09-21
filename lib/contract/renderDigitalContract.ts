import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { jsPDF } from 'jspdf';
import { createAdminClient } from '@/lib/supabase/admin';
import { findProjectByAnyId } from '@/lib/contract/resolveProjectId';
import { isoToIndianDate } from '@/lib/projectStartTime';
import { formatInrAmount, officialAgreementFileName } from '@/lib/contract/agreementPdf';
import {
  PAGE_MARGIN_MM,
  drawOfficialHeader,
  drawParagraph,
  drawRows,
  drawSectionTitle,
  ensurePage,
  formatBuilbidPublicId,
  nonEmpty,
  numericProjectId,
  pdfSafeText,
  type AgreementParty,
} from '@/lib/contract/agreementPdf';
import {
  applyOverlayDates,
  drawExecutionSection,
  stampAgreementOverlay,
  type AadhaarEsignStamp,
  type DigitalContractOverlay,
} from '@/lib/contract/digitalContractOverlay';
import {
  buildMistriAgreementPayload,
  generateMistriAgreementPdfBytes,
  isMistriCivilService,
} from '@/lib/contract/mistriAgreement';
import {
  buildPlumberAgreementPayload,
  generatePlumberAgreementPdfBytes,
  isPlumberService,
} from '@/lib/contract/plumberAgreement';
import {
  buildElectricianAgreementPayload,
  generateElectricianAgreementPdfBytes,
  isElectricianService,
} from '@/lib/contract/electricianAgreement';
import {
  buildPainterAgreementPayload,
  generatePainterAgreementPdfBytes,
  isPainterService,
} from '@/lib/contract/painterAgreement';
import { maskAadhaarLast4 } from '@/lib/contract/aadhaar';
import type { BidRates, SubConfiguration, TrackType } from '@/lib/types';
import type { ConstructionTypesMap } from '@/lib/buildingConfig';

export const DIGITAL_CONTRACT_OTP_TTL_MS = 20 * 60 * 1000;
export const BUILBID_CORPORATE_AGREEMENT_EMAIL = 'builbidcorporate@gmail.com';

export type DigitalContractParty = 'client' | 'contractor';

export interface DigitalContractFields {
  plinthAreaSqft: number;
  startDate: string;
  completionDate: string;
  totalAgreedCost: number;
}

export interface DigitalContractRecord {
  id: string;
  project_id: string;
  plinth_area_sqft: number | string;
  start_date: string;
  completion_date: string;
  total_agreed_cost: number | string;
  client_email: string;
  contractor_email: string;
  client_name: string;
  contractor_name: string;
  client_aadhaar_hash: string;
  contractor_aadhaar_hash: string;
  client_aadhaar_last4: string;
  contractor_aadhaar_last4: string;
  client_token: string;
  contractor_token: string;
  client_otp_hash: string;
  contractor_otp_hash: string;
  otp_expires_at: string;
  client_verified_at: string | null;
  contractor_verified_at: string | null;
  client_signature_ref: string | null;
  contractor_signature_ref: string | null;
  status: 'pending_esign' | 'partially_signed' | 'signed';
  signed_at: string | null;
}

function secretPepper(): string {
  return (
    process.env.DIGITAL_CONTRACT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'builbid-digital-contract'
  );
}

export function hashValue(value: string): string {
  return createHash('sha256').update(`${secretPepper()}:${value}`).digest('hex');
}

export function safeEqualHash(stored: string, incoming: string): boolean {
  const a = Buffer.from(stored);
  const b = Buffer.from(incoming);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function generateEsignToken(): string {
  return randomBytes(24).toString('hex');
}

export function makeSignatureRef(input: string): string {
  const hex = createHmac('sha256', secretPepper()).update(input).digest('hex').slice(0, 16).toUpperCase();
  return `ESIGN-${hex}`;
}

export function istStamp(value?: string | Date | null): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function overlayFromFields(
  fields: DigitalContractFields,
  stamps?: AadhaarEsignStamp[] | null,
  watermark?: DigitalContractOverlay['watermark'],
): DigitalContractOverlay {
  return {
    plinthAreaLabel: `${Number(fields.plinthAreaSqft).toLocaleString('en-IN')} sq. ft.`,
    totalAgreedCostLabel: formatInrAmount(Number(fields.totalAgreedCost)),
    startDateLabel: isoToIndianDate(fields.startDate) || fields.startDate,
    completionDateLabel: isoToIndianDate(fields.completionDate) || fields.completionDate,
    watermark: watermark ?? (stamps?.length ? 'AADHAAR ESIGN COMPLETE' : 'DRAFT FOR ESIGN REVIEW'),
    esignStamps: stamps ?? null,
  };
}

export function overlayFromRecord(
  record: DigitalContractRecord,
  mode: 'draft' | 'signed',
): DigitalContractOverlay {
  const fields: DigitalContractFields = {
    plinthAreaSqft: Number(record.plinth_area_sqft),
    startDate: String(record.start_date).slice(0, 10),
    completionDate: String(record.completion_date).slice(0, 10),
    totalAgreedCost: Number(record.total_agreed_cost),
  };
  const pendingStamp = (partyTitle: string, name: string, last4: string): AadhaarEsignStamp => ({
    partyTitle,
    signerName: name,
    aadhaarLast4: last4,
    signedAtLabel: 'Pending OTP',
    signatureRef: 'AWAITING ESIGN',
  });
  const clientStamp: AadhaarEsignStamp = record.client_verified_at
    ? {
        partyTitle: 'PARTY A: HOMEOWNER',
        signerName: record.client_name,
        aadhaarLast4: record.client_aadhaar_last4,
        signedAtLabel: istStamp(record.client_verified_at),
        signatureRef: record.client_signature_ref || 'ESIGN-CLIENT',
      }
    : pendingStamp('PARTY A: HOMEOWNER', record.client_name, record.client_aadhaar_last4);
  const contractorStamp: AadhaarEsignStamp = record.contractor_verified_at
    ? {
        partyTitle: 'PARTY B: CONTRACTOR',
        signerName: record.contractor_name,
        aadhaarLast4: record.contractor_aadhaar_last4,
        signedAtLabel: istStamp(record.contractor_verified_at),
        signatureRef: record.contractor_signature_ref || 'ESIGN-CONTRACTOR',
      }
    : pendingStamp('PARTY B: CONTRACTOR', record.contractor_name, record.contractor_aadhaar_last4);
  const witness: AadhaarEsignStamp = {
    partyTitle: 'WITNESS / BUILBID',
    signerName: 'BuilBid Platform',
    aadhaarLast4: 'BBID',
    signedAtLabel: mode === 'signed' ? istStamp(record.signed_at) : 'After dual eSign',
    signatureRef: mode === 'signed' ? makeSignatureRef(`${record.id}|witness`) : 'PENDING',
  };
  return overlayFromFields(fields, [clientStamp, contractorStamp, witness], mode === 'signed' ? 'AADHAAR ESIGN COMPLETE' : 'DRAFT FOR ESIGN REVIEW');
}

function partyFromProfile(
  row: {
    full_name?: string | null;
    email?: string | null;
    mobile?: string | null;
    physical_address?: string | null;
    company_name?: string | null;
    gst_number?: string | null;
    years_in_business?: number | null;
    is_verified?: boolean | null;
  } | null,
  fallback: string,
  platformId?: string,
): AgreementParty {
  return {
    name: row?.full_name || fallback,
    email: row?.email,
    mobile: row?.mobile,
    address: row?.physical_address,
    companyName: row?.company_name,
    gstNumber: row?.gst_number,
    yearsInBusiness: row?.years_in_business,
    isVerified: row?.is_verified,
    platformId,
  };
}

export async function generateDigitalContractPdf(
  projectId: string,
  overlay: DigitalContractOverlay,
): Promise<{ bytes: Uint8Array; filename: string; summary: Record<string, string> }> {
  const admin = createAdminClient();
  const { data: project, errorMessage } = await findProjectByAnyId<{
    id: string;
    owner_id: string;
    title: string;
    district: string;
    state: string;
    pincode: string | null;
    description: string | null;
    track_type: string | null;
    sub_configuration: unknown;
    building_types: unknown;
    construction_types: unknown;
    total_floors: number | null;
    plot_area_sqft: number | null;
    floor_area_sqft: number | null;
    mistri_details: unknown;
    painter_details: unknown;
    trade_details: unknown;
    service_type: string | null;
    selected_builder_id: string | null;
    numeric_id: string | null;
  }>(
    admin,
    projectId,
    'id, owner_id, title, district, state, pincode, description, track_type, sub_configuration, building_types, construction_types, total_floors, plot_area_sqft, floor_area_sqft, mistri_details, painter_details, trade_details, service_type, selected_builder_id, numeric_id',
  );

  if (!project) {
    console.error('[generateDigitalContractPdf] Project lookup failed.', {
      projectId,
      errorMessage,
    });
    throw new Error('Project not found.');
  }
  const canonicalId = project.id;
  if (!project.selected_builder_id) {
    throw new Error('No contractor has been finalized for this project yet.');
  }

  const [{ data: ownerRow }, { data: contractorRow }, { data: winningBid }] = await Promise.all([
    admin
      .from('profiles')
      .select('full_name, email, mobile, physical_address')
      .eq('id', project.owner_id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select(
        'full_name, email, mobile, physical_address, company_name, gst_number, years_in_business, is_verified',
      )
      .eq('id', project.selected_builder_id)
      .maybeSingle(),
    admin
      .from('bids')
      .select('id, total_sum_metric, single_rate, rates')
      .eq('project_id', canonicalId)
      .eq('builder_id', project.selected_builder_id)
      .limit(1)
      .maybeSingle(),
  ]);

  const owner = partyFromProfile(ownerRow, 'Client');
  const contractor = partyFromProfile(
    contractorRow,
    'Contractor',
    project.selected_builder_id,
  );
  const bid = winningBid
    ? {
        id: winningBid.id,
        single_rate: winningBid.single_rate,
        total_sum_metric: winningBid.total_sum_metric,
        rates: winningBid.rates as BidRates | null,
      }
    : null;

  const filename = officialAgreementFileName(project.id, project.numeric_id);
  const summary: Record<string, string> = {
    'Project': project.title,
    'Project ID': numericProjectId(project.numeric_id) || project.id.slice(0, 8),
    'Client / Homeowner': owner.name,
    'Contractor': contractor.companyName || contractor.name,
    'Site': [project.district, project.state, project.pincode].filter(Boolean).join(', ') || '—',
    'Approximate Plinth Area': overlay.plinthAreaLabel || '—',
    'Start Date': overlay.startDateLabel || '—',
    'Target Completion Date': overlay.completionDateLabel || '—',
    'Total Agreed Project Cost': overlay.totalAgreedCostLabel || '—',
  };

  if (isPlumberService(project.service_type)) {
    const payload = buildPlumberAgreementPayload({
      project: {
        id: project.id,
        numeric_id: project.numeric_id,
        title: project.title,
        district: project.district,
        state: project.state,
        pincode: project.pincode,
        description: project.description,
        trade_details: project.trade_details,
        sub_configuration: project.sub_configuration,
        service_type: project.service_type,
      },
      bid,
      owner,
      plumber: contractor,
    });
    return { bytes: generatePlumberAgreementPdfBytes(payload, overlay), filename, summary };
  }

  if (isElectricianService(project.service_type)) {
    const payload = buildElectricianAgreementPayload({
      project: {
        id: project.id,
        numeric_id: project.numeric_id,
        title: project.title,
        district: project.district,
        state: project.state,
        pincode: project.pincode,
        description: project.description,
        trade_details: project.trade_details,
        sub_configuration: project.sub_configuration,
        service_type: project.service_type,
      },
      bid,
      owner,
      electrician: contractor,
    });
    return { bytes: generateElectricianAgreementPdfBytes(payload, overlay), filename, summary };
  }

  if (isPainterService(project.service_type)) {
    const payload = buildPainterAgreementPayload({
      project: {
        id: project.id,
        numeric_id: project.numeric_id,
        title: project.title,
        district: project.district,
        state: project.state,
        pincode: project.pincode,
        description: project.description,
        painter_details: project.painter_details,
        service_type: project.service_type,
      },
      bid,
      owner,
      painter: contractor,
    });
    return { bytes: generatePainterAgreementPdfBytes(payload, overlay), filename, summary };
  }

  if (!project.service_type || isMistriCivilService(project.service_type)) {
    const payload = buildMistriAgreementPayload({
      project: {
        id: project.id,
        numeric_id: project.numeric_id,
        title: project.title,
        district: project.district,
        state: project.state,
        pincode: project.pincode,
        description: project.description,
        track_type: (project.track_type ?? 'RCC') as TrackType,
        sub_configuration: (project.sub_configuration ?? {}) as SubConfiguration,
        building_types: project.building_types,
        construction_types: (project.construction_types ?? null) as ConstructionTypesMap | null,
        total_floors: project.total_floors,
        plot_area_sqft: project.plot_area_sqft,
        floor_area_sqft: project.floor_area_sqft,
        mistri_details: project.mistri_details,
        service_type: project.service_type,
      },
      bid,
      owner,
      mistri: contractor,
    });
    return { bytes: generateMistriAgreementPdfBytes(payload, overlay), filename, summary };
  }

  const bytes = generateGenericDigitalContractPdf({
    projectId: project.id,
    numericProjectId: numericProjectId(project.numeric_id),
    projectTitle: project.title,
    serviceType: String(project.service_type ?? 'awarded work'),
    siteAddress: [project.district, project.state, project.pincode].filter(Boolean).join(', ') || '—',
    owner,
    contractor,
    description: project.description,
    bidLabel:
      bid?.total_sum_metric != null
        ? formatInrAmount(Number(bid.total_sum_metric))
        : bid?.single_rate != null
          ? `${formatInrAmount(Number(bid.single_rate))} / unit`
          : 'See awarded bid on BuilBid',
    overlay,
  });
  return { bytes, filename, summary };
}

function generateGenericDigitalContractPdf(input: {
  projectId: string;
  numericProjectId: string;
  projectTitle: string;
  serviceType: string;
  siteAddress: string;
  owner: AgreementParty;
  contractor: AgreementParty;
  description: string | null;
  bidLabel: string;
  overlay: DigitalContractOverlay;
}): Uint8Array {
  const payload = applyOverlayDates(
    {
      agreedStartDate: input.overlay.startDateLabel || '—',
      agreedCompletionDate: input.overlay.completionDateLabel || '—',
    },
    input.overlay,
  );
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = PAGE_MARGIN_MM;
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawOfficialHeader(
    doc,
    margin,
    `${input.serviceType.replace(/_/g, ' ')}  |  Official platform record`,
    'DIGITAL CONSTRUCTION AGREEMENT',
  );
  y = drawParagraph(
    doc,
    'Legal Notice: This is an official digital contract between the Homeowner and the Contractor. BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
    y,
    margin,
    { bold: true },
  );
  y = drawSectionTitle(doc, '1. Parties to the Agreement', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Project title', value: input.projectTitle },
      { label: 'Project ID', value: input.numericProjectId || input.projectId.slice(0, 8) },
      { label: 'PARTY A — Homeowner', value: nonEmpty(input.owner.name) },
      { label: 'Phone / WhatsApp', value: nonEmpty(input.owner.mobile) },
      { label: 'Site address', value: input.siteAddress },
      { label: 'PARTY B — Contractor', value: nonEmpty(input.contractor.companyName || input.contractor.name) },
      { label: 'builbid ID', value: formatBuilbidPublicId(input.contractor.platformId) },
    ],
    y,
    margin,
  );
  y = drawSectionTitle(doc, '2. Scope of Work', y, margin);
  y = drawParagraph(
    doc,
    input.description?.trim() ||
      'Scope of work is as awarded on BuilBid from the project posting and accepted bid.',
    y,
    margin,
  );
  if (input.overlay.plinthAreaLabel) {
    y = drawRows(
      doc,
      [{ label: 'Approximate Plinth Area (Sq. Ft.)', value: input.overlay.plinthAreaLabel }],
      y,
      margin,
    );
  }
  y = drawSectionTitle(doc, '3. Fixed Rates & Payment Terms', y, margin);
  y = drawParagraph(
    doc,
    'Fixed Non-Negotiable Rate: The final bid price accepted on BuilBid is fixed. No bargaining or rate changes are permitted after acceptance.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Mandatory BuilBid Payment Gateway: All funds must flow exclusively through BuilBid (Homeowner -> BuilBid Milestone Escrow -> Contractor). Direct cash payments to the Contractor are strictly prohibited and nullify all platform guarantees.',
    y,
    margin,
    { bold: true, fill: [254, 226, 226], bordered: true },
  );
  y = drawRows(
    doc,
    [
      { label: 'Accepted bid', value: input.bidLabel },
      ...(input.overlay.totalAgreedCostLabel
        ? [{ label: 'Total Agreed Project Cost', value: input.overlay.totalAgreedCostLabel }]
        : []),
    ],
    y,
    margin,
  );
  y = drawSectionTitle(doc, '4. Timelines, Delays & Penalty Terms', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Agreed start date', value: payload.agreedStartDate },
      { label: 'Agreed completion date', value: payload.agreedCompletionDate },
      { label: 'Grace extension allowed', value: '10 Calendar Days (Penalty Free)' },
    ],
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Contractor Delay Penalty (5%): If the project extends beyond the 10-day grace period due to unexcused Contractor delay or absenteeism, a 5% penalty is deducted from the Contractor payout through BuilBid.',
    y,
    margin,
    { bold: true, fill: [254, 226, 226], bordered: true },
  );
  y = drawExecutionSection(
    doc,
    y,
    margin,
    input.overlay,
    'This agreement is signed on-site by the Homeowner and Contractor in the presence of the BuilBid Field Coordinator.',
    [
      ['PARTY A: HOMEOWNER', 'Signature / Thumb'],
      ['PARTY B: CONTRACTOR', 'Signature / Thumb'],
      ['WITNESS / BUILBID', 'Coordinator Signature'],
    ],
  );
  y = ensurePage(doc, y, 10, margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  const footer = doc.splitTextToSize(
    pdfSafeText(
      'Official BuilBid digital agreement for awarded work. Cash payments outside the BuilBid gateway void platform guarantees.',
    ),
    pageW - margin * 2,
  ) as string[];
  doc.text(footer, margin, y);
  stampAgreementOverlay(doc, input.overlay);
  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://builbid.in';
}

export function esignUrl(token: string): string {
  return `${siteOrigin()}/esign/${token}`;
}

export function maskAadhaarForCopy(last4: string): string {
  return maskAadhaarLast4(last4);
}

export function isMissingDigitalContractTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    message.includes('project_digital_contracts') ||
    message.includes('does not exist')
  );
}
