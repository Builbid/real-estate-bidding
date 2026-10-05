import { jsPDF } from 'jspdf';
import type { BidRates, ServiceType } from '@/lib/types';
import {
  AGREEMENT_MANUAL_DATE_BLANK,
  PAGE_MARGIN_MM,
  appendChecklistRecord,
  appendMeasuredSchedule,
  cleanAgreementText,
  drawOfficialHeader,
  drawParagraph,
  filledAgreementText,
  drawRows,
  drawSectionTitle,
  ensurePage,
  formatBuilbidPublicId,
  formatInrAmount,
  nonEmpty,
  numericProjectId,
  officialAgreementEmailSubject,
  officialAgreementFileName,
  pdfSafeText,
  type AgreementParty,
  type AgreementRow,
} from '@/lib/contract/agreementPdf';
import {
  applyOverlayDates,
  drawExecutionSection,
  stampAgreementOverlay,
  type DigitalContractOverlay,
} from '@/lib/contract/digitalContractOverlay';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  getPainterWorkRequirementBlocks,
  parsePainterDetails,
} from '@/lib/painterDetails';

export type PainterAgreementParty = AgreementParty;
export type PainterAgreementRow = AgreementRow;

const SCOPE_LABELS_EXCLUDED_FROM_AGREEMENT = new Set([
  'Work Start Time',
  'Work Start Timeline',
  'Start Time',
  'Approximate Paint Area',
  'Estimated Paint Area',
  'Carpet / Floor Area',
  'Approx. Carpet / Floor Area',
  'Approx. House / Floor Area',
  'Painting Work Coverage',
]);

const FLOOR_RATE_KEYS = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'] as const;
const FLOOR_RATE_LABELS = ['Ground floor', 'First floor', 'Second floor', 'Third floor'] as const;

export function isPainterService(serviceType?: string | null): boolean {
  return (serviceType ?? '').toLowerCase() === 'painter';
}

export interface PainterAgreementProjectInput {
  id: string;
  numeric_id?: string | null;
  title: string;
  district: string;
  state?: string | null;
  pincode?: string | null;
  description?: string | null;
  painter_details?: unknown;
  service_type?: ServiceType | string | null;
}

export interface PainterAgreementBidInput {
  id?: string | null;
  single_rate?: number | null;
  total_sum_metric?: number | null;
  rates?: BidRates | Partial<BidRates> | null;
}

export interface PainterAgreementPayload {
  projectId: string;
  numericProjectId: string;
  projectTitle: string;
  generatedAtLabel: string;
  siteAddress: string;
  client: PainterAgreementParty;
  painter: PainterAgreementParty;
  scopeRows: PainterAgreementRow[];
  bidRows: PainterAgreementRow[];
  contractorRows: PainterAgreementRow[];
  acceptedRateLabel: string;
  districtPincode: string;
  agreedStartDate: string;
  agreedCompletionDate: string;
}

function formatRateWithSuffix(value: number, suffix: string): string {
  const unit = suffix.trim();
  if (!unit) return formatInrAmount(value);
  if (unit.startsWith('/')) return `${formatInrAmount(value)} ${unit}`;
  return `${formatInrAmount(value)} ${unit}`;
}

function buildSiteAddress(project: PainterAgreementProjectInput): string {
  const parts = [project.district?.trim(), project.state?.trim(), project.pincode?.trim()].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(', ') : '—';
}

function buildScopeRows(project: PainterAgreementProjectInput): PainterAgreementRow[] {
  const details = parsePainterDetails(readNestedProjectDetail(project, 'painter_details'));
  if (!details) return [];

  const seen = new Set<string>();
  const rows: PainterAgreementRow[] = [];
  for (const block of getPainterWorkRequirementBlocks(details)) {
    if (SCOPE_LABELS_EXCLUDED_FROM_AGREEMENT.has(block.label)) continue;
    const value = cleanAgreementText(block.value);
    const key = `${block.label}|${value}`;
    if (seen.has(key) || !value) continue;
    seen.add(key);
    rows.push({ label: block.label, value });
  }
  return rows;
}

function buildPainterBidRows(bid: PainterAgreementBidInput | null): PainterAgreementRow[] {
  const rates = bid?.rates ?? null;
  const floorRows = FLOOR_RATE_KEYS.flatMap((key, index) => {
    const value = Number(rates?.[key]);
    if (!Number.isFinite(value) || value <= 0) return [];
    return [
      {
        label: `${FLOOR_RATE_LABELS[index]} rate`,
        value: cleanAgreementText(formatRateWithSuffix(value, '/sqft')),
      },
    ];
  });
  if (floorRows.length > 0) return floorRows;

  const amount = bid?.single_rate ?? bid?.total_sum_metric;
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    return [
      {
        label: 'Accepted painter rate',
        value: cleanAgreementText(formatRateWithSuffix(amount, '/sqft')),
      },
    ];
  }

  return [];
}

export function buildPainterAgreementPayload(input: {
  project: PainterAgreementProjectInput;
  bid: PainterAgreementBidInput | null;
  owner: PainterAgreementParty;
  painter: PainterAgreementParty;
}): PainterAgreementPayload {
  const { project, bid, owner, painter } = input;
  const bidRows = buildPainterBidRows(bid);
  const acceptedRateLabel =
    bidRows.length > 0
      ? bidRows.map((row) => `${row.label}: ${row.value}`).join('; ')
      : 'See awarded bid on BuilBid';

  const contractorRows: PainterAgreementRow[] = [
    { label: 'Painter / contractor', value: nonEmpty(painter.companyName || painter.name) },
    { label: 'builbid ID', value: formatBuilbidPublicId(painter.platformId) },
    { label: 'Registered email', value: nonEmpty(painter.email) },
    { label: 'Mobile / WhatsApp', value: nonEmpty(painter.mobile) },
    { label: 'Government ID / GST / Govt Reg No', value: nonEmpty(painter.gstNumber) },
  ];

  const districtPincode =
    [project.district?.trim(), project.pincode?.trim()].filter(Boolean).join(' / ') || '—';

  return {
    projectId: project.id,
    numericProjectId: numericProjectId(project.numeric_id),
    projectTitle: project.title,
    generatedAtLabel: new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    siteAddress: buildSiteAddress(project),
    client: owner,
    painter,
    scopeRows: buildScopeRows(project),
    bidRows,
    contractorRows,
    acceptedRateLabel: cleanAgreementText(acceptedRateLabel),
    districtPincode,
    agreedStartDate: AGREEMENT_MANUAL_DATE_BLANK,
    agreedCompletionDate: AGREEMENT_MANUAL_DATE_BLANK,
  };
}

/**
 * Official signed painter agreement PDF.
 * Currency uses "Rs." (Helvetica-safe). On-screen/email copy may show ₹.
 */
export function generatePainterAgreementPdfBytes(
  payload: PainterAgreementPayload,
  overlay?: DigitalContractOverlay | null,
): Uint8Array {
  const filled = applyOverlayDates(payload, overlay);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = PAGE_MARGIN_MM;
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawOfficialHeader(
    doc,
    margin,
    'Painter (Painting Work)  |  Official platform record',
    'DIGITAL CONSTRUCTION & PAINTER AGREEMENT',
  );

  y = drawParagraph(
    doc,
    'Legal Notice: This is an official digital contract between the Homeowner and the Painter. BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
    y,
    margin,
    { bold: true },
  );

  y = drawSectionTitle(doc, '1. Parties to the Agreement', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Project title', value: filled.projectTitle },
      { label: 'Project ID', value: filled.numericProjectId || '—' },
      { label: 'PARTY A — Homeowner', value: nonEmpty(filled.client.name) },
      { label: 'Phone / WhatsApp', value: nonEmpty(filled.client.mobile) },
      { label: 'Site address', value: filled.siteAddress },
      { label: 'District / Pincode', value: filled.districtPincode },
    ],
    y,
    margin,
  );
  y = drawRows(
    doc,
    [
      { label: 'PARTY B — Painter', value: nonEmpty(filled.painter.companyName || filled.painter.name) },
      { label: 'Phone / WhatsApp', value: nonEmpty(filled.painter.mobile) },
      { label: 'builbid ID', value: formatBuilbidPublicId(filled.painter.platformId) },
    ],
    y,
    margin,
  );

  y = drawSectionTitle(doc, '2. Work Specifications & Site Verification', y, margin);
  y = drawParagraph(
    doc,
    'Joint Site Review: Homeowner, Painter, and BuilBid Field Coordinator must jointly review the site to confirm surfaces, coats, and the actual painting area before execution.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Painter work specifications: All bids are strictly for PAINTER CHARGES. Materials must be supplied by the Property Owner. Extra coats, decorative finishes, or work outside the awarded bid must be negotiated separately without BuilBid involvement.',
    y,
    margin,
  );
  y = drawRows(doc, filled.scopeRows, y, margin);
  y = appendChecklistRecord(doc, y, margin, overlay?.checklistRows);

  y = drawSectionTitle(doc, '3. Fixed Rates & Payment Terms', y, margin);
  y = drawParagraph(
    doc,
    'Fixed Non-Negotiable Rate: The final bid price accepted on BuilBid is fixed. No bargaining or rate changes are permitted after acceptance. Final settlement follows actual site measurement at these agreed unit rates.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Mandatory BuilBid Payment Gateway: All funds must flow exclusively through BuilBid (Homeowner -> BuilBid Payment Gateway -> Painter). Direct cash payments to the Painter are strictly prohibited and nullify all platform guarantees.',
    y,
    margin,
    { bold: true, fill: [254, 226, 226], bordered: true },
  );
  y = drawRows(doc, filled.bidRows.length > 0 ? filled.bidRows : [{ label: 'Awarded painting work', value: 'As posted and accepted on BuilBid' }], y, margin);
  y = appendMeasuredSchedule(doc, y, margin, overlay?.measuredSchedule);
  y = drawRows(
    doc,
    [
      {
        label: 'Approximate work area',
        value: filledAgreementText(overlay?.plinthAreaLabel, 'As measured on the site visit'),
      },
      {
        label: 'Total Agreed Project Cost',
        value: filledAgreementText(overlay?.totalAgreedCostLabel, filled.acceptedRateLabel),
      },
    ],
    y,
    margin,
  );

  y = drawSectionTitle(doc, '4. Timelines, Delays & Penalty Terms', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Agreed start date', value: filledAgreementText(filled.agreedStartDate, AGREEMENT_MANUAL_DATE_BLANK) },
      { label: 'Agreed completion date', value: filledAgreementText(filled.agreedCompletionDate, AGREEMENT_MANUAL_DATE_BLANK) },
      { label: 'Grace extension allowed', value: '5 Calendar Days (Penalty Free)' },
    ],
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Timeline: Start Date is when physical painting work begins after materials are confirmed on site. Completion Date is the mutually agreed handover deadline for 100% of the awarded Painter work.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Material Supply: Homeowners must supply painting materials on time. Homeowner material delays extend the deadline and void the on-time completion guarantee.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'If the work runs past the grace period, a 5% penalty per week or milestone is applied through the BuilBid Payment Gateway.',
    y,
    margin,
    { bold: true, fill: [254, 226, 226], bordered: true },
  );

  y = drawExecutionSection(doc, y, margin, overlay);

  y = ensurePage(doc, y, 10, margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  const footer = doc.splitTextToSize(
    pdfSafeText(
      'Official BuilBid digital agreement for awarded Painter work. Cash payments outside the BuilBid gateway void platform guarantees.',
    ),
    pageW - margin * 2,
  ) as string[];
  doc.text(footer, margin, y);

  stampAgreementOverlay(doc, overlay);
  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

export function painterAgreementFileName(projectId: string, numericId?: string | null): string {
  return officialAgreementFileName(projectId, numericId);
}

export function painterAgreementEmailSubject(projectId: string, numericId?: string | null): string {
  return officialAgreementEmailSubject(projectId, numericId, 'Painter / Painting Work');
}
