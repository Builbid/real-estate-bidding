import { jsPDF } from 'jspdf';
import {
  isStructuralConstructionType,
  type ConstructionTypeValue,
  type ConstructionTypesMap,
} from '@/lib/buildingConfig';
import {
  formatMistriFloorWorkLabel,
  formatMistriFloorWorkTypes,
  getMistriWorkRequirementBlocks,
  hasAssamMistriFloorWork,
  isAssamMistriFloor,
  parseMistriDetails,
  type MistriCivilWorkType,
  type MistriFloorWorkType,
} from '@/lib/mistriDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import type { BidRates, ServiceType, SubConfiguration, TrackType } from '@/lib/types';
import {
  flooringFittingTitle,
  getMistriCivilRateDisplayEntries,
  getMistriFlooringRateDisplayEntries,
  resolveMistriCivilFloors,
} from '@/lib/bid/mistriCivilCost';

/** Official mailbox that already receives selection notices (GMAIL_USER). */
export const BUILBID_CORP_GMAIL = 'builbidcorp@gmail.com';

/** Default official recipients for mistri agreement PDFs. */
export const BUILBID_OFFICIAL_AGREEMENT_EMAILS = [BUILBID_CORP_GMAIL] as const;

const STRUCTURAL_CIVIL_TYPES: ReadonlySet<string> = new Set<MistriCivilWorkType | string>([
  'complete_full_structure',
  'foundation_concrete_structure',
  'rcc_column_beam_slab',
]);

const STRUCTURAL_FLOOR_WORK: ReadonlySet<MistriFloorWorkType> = new Set([
  'full_finished',
  'frame_skeleton',
]);

const SCOPE_LABELS_EXCLUDED_FROM_AGREEMENT = new Set([
  'Work Start Time',
  'Start Time',
  'Built-Up Area',
  'Built-up area',
  'Approx. Area',
  'Approximate built-up Area (Sqft)',
  'Approximate Built-up Area (Sqft)',
]);

/** Blank line on the printed agreement so dates can be filled in by hand on site. */
export const AGREEMENT_MANUAL_DATE_BLANK = '________________________';

/** Table / box border — slate-200. */
const BORDER_RGB: [number, number, number] = [226, 232, 240];
const PAGE_MARGIN_MM = 14;

export function isMistriCivilService(serviceType?: string | null): boolean {
  const value = (serviceType ?? 'labour_contractor').toLowerCase();
  return value === 'labour_contractor' || value === 'mistri' || value === 'civil_construction';
}

export interface MistriAgreementProjectInput {
  id: string;
  title: string;
  district: string;
  state?: string | null;
  pincode?: string | null;
  description?: string | null;
  track_type: TrackType;
  sub_configuration?: SubConfiguration | null;
  building_types?: string[] | null;
  construction_types?: ConstructionTypesMap | null;
  total_floors?: number | null;
  plot_area_sqft?: number | null;
  floor_area_sqft?: number | null;
  mistri_details?: unknown;
  service_type?: ServiceType | string | null;
}

export interface MistriAgreementParty {
  name: string;
  email?: string | null;
  mobile?: string | null;
  address?: string | null;
  companyName?: string | null;
  gstNumber?: string | null;
  yearsInBusiness?: number | null;
  isVerified?: boolean | null;
  platformId?: string | null;
}

export interface MistriAgreementBidInput {
  id?: string | null;
  single_rate?: number | null;
  total_sum_metric?: number | null;
  rates?: BidRates | Partial<BidRates> | null;
}

export interface MistriAgreementRow {
  label: string;
  value: string;
}

export interface MistriAgreementPayload {
  projectId: string;
  projectTitle: string;
  generatedAtLabel: string;
  isRccStructural: boolean;
  siteAddress: string;
  client: MistriAgreementParty;
  mistri: MistriAgreementParty;
  scopeRows: MistriAgreementRow[];
  bidRows: MistriAgreementRow[];
  contractorRows: MistriAgreementRow[];
  acceptedRateSqft: number;
  acceptedRateLabel: string;
  slabAreaSqft: number;
  slabAreaLabel: string;
  districtPincode: string;
  agreedStartDate: string;
  agreedCompletionDate: string;
}

/** Platform currency uses ₹; Helvetica cannot draw it — PDF draw path maps to Rs. */
function formatInrAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '₹—';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function pdfSafeText(text: string): string {
  return text.replace(/₹/g, 'Rs.');
}

function formatCivilRatePerSlab(value: number): string {
  return `${formatInrAmount(value)} / sq. ft. of slab area`;
}

function formatWallRatePerWall(value: number): string {
  return `${formatInrAmount(value)} / sq. ft. of wall area`;
}

function formatFlooringRatePerFloor(value: number): string {
  return `${formatInrAmount(value)} / sq. ft. of floor area`;
}

/** Strip accidental trailing punctuation like ". ." from formatted strings. */
function cleanAgreementText(value: string): string {
  return value
    .replace(/\s+\.\s*\./g, '.')
    .replace(/\.\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function nonEmpty(value: string | null | undefined, fallback = '—'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function hasRccBuildingContext(project: MistriAgreementProjectInput): boolean {
  if (project.track_type === 'RCC') return true;
  if ((project.building_types ?? []).some((type) => type.startsWith('RCC'))) return true;
  const mistri = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  return !!mistri?.floorWork?.some((fw) => !isAssamMistriFloor(fw.floorId));
}

function hasStructuralMistriScope(project: MistriAgreementProjectInput): boolean {
  const mistri = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  if (mistri?.civilWorkTypes?.some((type) => STRUCTURAL_CIVIL_TYPES.has(type))) return true;
  if (
    mistri?.floorWork?.some(
      (fw) =>
        !isAssamMistriFloor(fw.floorId) &&
        fw.workTypes.some((type) => STRUCTURAL_FLOOR_WORK.has(type)),
    )
  ) {
    return true;
  }

  const constructionTypes = project.construction_types ?? {};
  return Object.entries(constructionTypes).some(([type, value]) => {
    if (!type.startsWith('RCC') || !value) return false;
    return isStructuralConstructionType(value as ConstructionTypeValue);
  });
}

/** RCC structural Head Mason work — slab-area rate basis applies. */
export function isRccStructuralMistriWork(project: MistriAgreementProjectInput): boolean {
  if (!isMistriCivilService(project.service_type)) return false;
  const mistri = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  if (hasAssamMistriFloorWork(mistri) && !hasRccBuildingContext(project)) return false;
  return hasRccBuildingContext(project) && hasStructuralMistriScope(project);
}

function buildSiteAddress(project: MistriAgreementProjectInput): string {
  const parts = [
    project.district?.trim(),
    project.state?.trim(),
    project.pincode?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
}

function buildScopeRows(project: MistriAgreementProjectInput): MistriAgreementRow[] {
  const mistri = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  const seen = new Set<string>();
  const rows: MistriAgreementRow[] = [];

  if (mistri?.floorWork && mistri.floorWork.length > 0) {
    for (const fw of mistri.floorWork) {
      const label = formatMistriFloorWorkLabel(fw);
      // Force live wizard mapping — ignore stale stored scopeLabel.
      const value = cleanAgreementText(
        formatMistriFloorWorkTypes(fw.workTypes, { ...fw, scopeLabel: null }),
      );
      const key = `${label}|${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ label, value });
    }

    for (const block of getMistriWorkRequirementBlocks(mistri)) {
      if (SCOPE_LABELS_EXCLUDED_FROM_AGREEMENT.has(block.label)) continue;
      if (/built[- ]?up|approx\.?\s*area|approximate.*area/i.test(block.label)) continue;
      // Floor rows already added above from live mapping.
      if (/^(RCC\s+|Assam Type|Ground Floor|Custom Floor|\d)/i.test(block.label)) continue;
      const key = `${block.label}|${block.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        label: block.label,
        value: cleanAgreementText(block.value),
      });
    }
    return rows;
  }

  for (const block of mistri ? getMistriWorkRequirementBlocks(mistri) : []) {
    if (SCOPE_LABELS_EXCLUDED_FROM_AGREEMENT.has(block.label)) continue;
    if (/built[- ]?up|approx\.?\s*area|approximate.*area/i.test(block.label)) continue;
    const key = `${block.label}|${block.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      label: block.label,
      value: cleanAgreementText(
        block.value.replace(/\bStructure\s*\/\s*Frame Only\b/gi, 'Frame / Slab Casting Only'),
      ),
    });
  }

  return rows;
}

export function buildMistriAgreementPayload(input: {
  project: MistriAgreementProjectInput;
  bid: MistriAgreementBidInput | null;
  owner: MistriAgreementParty;
  mistri: MistriAgreementParty;
}): MistriAgreementPayload {
  const { project, bid, owner, mistri } = input;
  const isRccStructural = isRccStructuralMistriWork(project);

  const civilFloors = resolveMistriCivilFloors(project);
  const rateEntries = getMistriCivilRateDisplayEntries(bid?.rates, civilFloors);
  const flooringRateEntries = getMistriFlooringRateDisplayEntries(bid?.rates, civilFloors);
  const acceptedRateSqft = rateEntries.length === 1 ? rateEntries[0].rate : 0;
  const acceptedRateLabel =
    rateEntries.length === 1
      ? formatCivilRatePerSlab(rateEntries[0].rate)
      : rateEntries.length > 0
        ? rateEntries.map((entry) => `${entry.label}: ${formatCivilRatePerSlab(entry.rate)}`).join('; ')
        : formatCivilRatePerSlab(0);

  // Client-uploaded built-up / approximate area must not appear on the agreement.
  const bidRows: MistriAgreementRow[] = [];
  for (const entry of rateEntries) {
    const floor = civilFloors.find((item) => item.label === entry.label);
    const isWall = floor?.costKind === 'wall';
    bidRows.push({
      label: isWall
        ? `${entry.label} Wall Construction Rate`
        : `${entry.label} Civil Work Rate`,
      value: cleanAgreementText(
        isWall ? formatWallRatePerWall(entry.rate) : formatCivilRatePerSlab(entry.rate),
      ),
    });
  }
  for (const entry of flooringRateEntries) {
    bidRows.push({
      label: `${entry.floorLabel} ${flooringFittingTitle(entry.materialLabel)}`,
      value: cleanAgreementText(formatFlooringRatePerFloor(entry.rate)),
    });
  }

  const contractorRows: MistriAgreementRow[] = [
    { label: 'Head Mason / contractor', value: nonEmpty(mistri.companyName || mistri.name) },
    { label: 'builbid ID', value: nonEmpty(mistri.platformId) },
    { label: 'Registered email', value: nonEmpty(mistri.email) },
    { label: 'Mobile / WhatsApp', value: nonEmpty(mistri.mobile) },
    { label: 'Government ID / GST / Govt Reg No', value: nonEmpty(mistri.gstNumber) },
  ];

  const districtPincode = [project.district?.trim(), project.pincode?.trim()]
    .filter(Boolean)
    .join(' / ') || '—';

  return {
    projectId: project.id,
    projectTitle: project.title,
    generatedAtLabel: new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    isRccStructural,
    siteAddress: buildSiteAddress(project),
    client: owner,
    mistri,
    scopeRows: buildScopeRows(project),
    bidRows,
    contractorRows,
    acceptedRateSqft,
    acceptedRateLabel: cleanAgreementText(acceptedRateLabel),
    slabAreaSqft: 0,
    slabAreaLabel: '—',
    districtPincode,
    agreedStartDate: AGREEMENT_MANUAL_DATE_BLANK,
    agreedCompletionDate: AGREEMENT_MANUAL_DATE_BLANK,
  };
}

function ensurePage(doc: jsPDF, y: number, need: number, margin: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  y = ensurePage(doc, y, 10, margin);
  const usable = doc.internal.pageSize.getWidth() - margin * 2;
  doc.setFillColor(15, 118, 110);
  doc.rect(margin, y, usable, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255);
  doc.text(title.toUpperCase(), margin + 2.5, y + 4.5);
  doc.setTextColor(20);
  return y + 9;
}

function drawRows(
  doc: jsPDF,
  rows: MistriAgreementRow[],
  startY: number,
  margin: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const labelW = usable * 0.38;
  const valueW = usable - labelW;
  const padX = 2.5;
  let y = startY;

  for (const row of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const labelLines = doc.splitTextToSize(pdfSafeText(row.label), labelW - padX * 2) as string[];
    doc.setFont('helvetica', 'normal');
    const valueLines = doc.splitTextToSize(pdfSafeText(row.value || '—'), valueW - padX * 2) as string[];
    const rowH = Math.max(7, Math.max(labelLines.length, valueLines.length) * 3.8 + 3.5);
    y = ensurePage(doc, y, rowH + 0.5, margin);
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, usable, rowH);
    doc.line(margin + labelW, y, margin + labelW, y + rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(40);
    doc.text(labelLines, margin + padX, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20);
    doc.text(valueLines, margin + labelW + padX, y + 4.2);
    y += rowH;
  }
  return y + 3.5;
}

function drawParagraph(
  doc: jsPDF,
  text: string,
  startY: number,
  margin: number,
  opts?: { bold?: boolean; fill?: [number, number, number]; bordered?: boolean },
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const padX = 3.5;
  const padY = 3.2;
  doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(pdfSafeText(text), usable - padX * 2) as string[];
  const boxH = lines.length * 3.7 + padY * 2;
  const y = ensurePage(doc, startY, boxH + 1.5, margin);
  if (opts?.fill) {
    doc.setFillColor(...opts.fill);
    doc.rect(margin, y, usable, boxH, 'F');
  }
  if (opts?.bordered || opts?.fill) {
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.35);
    doc.rect(margin, y, usable, boxH, 'S');
  }
  doc.setTextColor(30);
  doc.text(lines, margin + padX, y + padY + 2.2);
  return y + boxH + 2.5;
}

function drawSignatureBlock(doc: jsPDF, startY: number, margin: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const gap = 3;
  const boxW = (usable - gap * 2) / 3;
  const boxH = 32;
  const y = ensurePage(doc, startY, boxH + 2, margin);
  const labels = [
    ['PARTY A: HOMEOWNER', 'Signature / Thumb'],
    ['PARTY B: HEAD MASON', 'Signature / Thumb'],
    ['WITNESS / BUILBID', 'Coordinator Signature'],
  ];
  labels.forEach((pair, i) => {
    const x = margin + i * (boxW + gap);
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.35);
    doc.rect(x, y, boxW, boxH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(20);
    const title = doc.splitTextToSize(pair[0], boxW - 4) as string[];
    doc.text(title, x + 2, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80);
    const sub = doc.splitTextToSize(pair[1], boxW - 4) as string[];
    doc.text(sub, x + 2, y + 10);
    doc.setDrawColor(120);
    doc.line(x + 3, y + 22, x + boxW - 3, y + 22);
    doc.setFontSize(6.5);
    doc.text('Date: ____ / ____ / 20__', x + 2, y + 28);
  });
  return y + boxH + 4;
}

/**
 * Official signed mistri agreement PDF.
 * Currency uses "Rs." (Helvetica-safe). On-screen/email copy may show ₹.
 */
export function generateMistriAgreementPdfBytes(payload: MistriAgreementPayload): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = PAGE_MARGIN_MM;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255);
  doc.text('BUILBID', margin, 9);
  doc.setFontSize(9);
  doc.text('DIGITAL CONSTRUCTION & LABOUR AGREEMENT', margin, 14.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Head Mason (Mistri / RCC Civil Work)  |  Official platform record', margin, 19);
  y = 26;

  y = drawParagraph(
    doc,
    'Legal Notice: This is an official digital contract between the Homeowner and the Head Mason (Mistri). BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
    y,
    margin,
    { bold: true },
  );

  y = drawSectionTitle(doc, '1. Parties to the Agreement', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Project title', value: payload.projectTitle },
      { label: 'PARTY A — Homeowner', value: nonEmpty(payload.client.name) },
      { label: 'Phone / WhatsApp', value: nonEmpty(payload.client.mobile) },
      { label: 'Site address', value: payload.siteAddress },
      { label: 'District / Pincode', value: payload.districtPincode },
    ],
    y,
    margin,
  );
  y = drawRows(
    doc,
    [
      { label: 'PARTY B — Head Mason', value: nonEmpty(payload.mistri.companyName || payload.mistri.name) },
      { label: 'Phone / WhatsApp', value: nonEmpty(payload.mistri.mobile) },
      { label: 'builbid ID', value: nonEmpty(payload.mistri.platformId) },
      { label: 'Govt ID / GST / Reg No', value: nonEmpty(payload.mistri.gstNumber) },
    ],
    y,
    margin,
  );

  y = drawSectionTitle(doc, '2. Scope of Work & Blueprint Verification', y, margin);
  y = drawParagraph(
    doc,
    'Joint Blueprint Review: Homeowner, Mistri, and BuilBid Field Coordinator must jointly review site blueprints to finalize the Plinth Area (Sq. Ft.) and on-site structural dimensions before execution.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Excluded Extra / Decorative Work: This agreement covers primary structural labour accepted during bidding only. Decorative plastering, complex moulding, or elevation designs are excluded and must be negotiated separately without BuilBid involvement.',
    y,
    margin,
  );
  y = drawRows(doc, payload.scopeRows, y, margin);

  y = drawSectionTitle(doc, '3. Fixed Rates & Payment Terms', y, margin);
  y = drawParagraph(
    doc,
    'Fixed Non-Negotiable Rate: The final bid price accepted on BuilBid is fixed. No bargaining or rate changes are permitted after acceptance.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Mandatory BuilBid Payment Gateway: All funds must flow exclusively through BuilBid (Homeowner -> BuilBid Milestone Escrow -> Mistri). Direct cash payments to the Mistri are strictly prohibited and nullify all platform guarantees.',
    y,
    margin,
    { bold: true, fill: [254, 226, 226], bordered: true },
  );
  y = drawRows(doc, payload.bidRows, y, margin);

  y = drawSectionTitle(doc, '4. Timelines, Delays & Penalty Terms', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Agreed start date', value: payload.agreedStartDate || AGREEMENT_MANUAL_DATE_BLANK },
      { label: 'Agreed completion date', value: payload.agreedCompletionDate || AGREEMENT_MANUAL_DATE_BLANK },
      { label: 'Grace extension allowed', value: '10 Calendar Days (Penalty Free)' },
    ],
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Timeline: Start Date is when physical construction begins after materials are confirmed. Completion Date is the mutually agreed handover deadline for 100% completed structural work.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Material Supply: Homeowners must supply materials on time. Homeowner material delays extend the deadline and void the on-time completion guarantee.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Mistri Delay Penalty (5%): If the project extends beyond the 10-day grace period due to unexcused Mistri delay or absenteeism, a 5% penalty is deducted from the labour payout through BuilBid.',
    y,
    margin,
    { bold: true, fill: [254, 226, 226], bordered: true },
  );

  y = drawSectionTitle(doc, '5. Execution & Physical Authorization', y, margin);
  y = drawParagraph(
    doc,
    'This agreement is signed on-site by the Homeowner and Head Mason in the presence of the BuilBid Field Coordinator.',
    y,
    margin,
  );
  y = drawSignatureBlock(doc, y, margin);

  y = ensurePage(doc, y, 10, margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  const footer = doc.splitTextToSize(
    'Official BuilBid digital agreement for awarded Mistri / RCC civil work. Cash payments outside the BuilBid gateway void platform guarantees.',
    pageW - margin * 2,
  ) as string[];
  doc.text(footer, margin, y);

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

export function mistriAgreementFileName(projectId: string): string {
  const safe = projectId.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 36) || 'project';
  return `Official-Signed-Agreement-${safe}.pdf`;
}

export function mistriAgreementEmailSubject(projectId: string): string {
  return `Official Signed Agreement - Project #${projectId} (Mistri / Civil Work)`;
}
