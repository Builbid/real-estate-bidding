import { jsPDF } from 'jspdf';
import {
  isStructuralConstructionType,
  type ConstructionTypeValue,
  type ConstructionTypesMap,
} from '@/lib/buildingConfig';
import {
  formatMistriStartTime,
  getMistriWorkRequirementBlocks,
  hasAssamMistriFloorWork,
  hasMistriTileFittingScope,
  isAssamMistriFloor,
  parseMistriDetails,
  type MistriCivilWorkType,
  type MistriFloorWorkType,
} from '@/lib/mistriDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import type { BidRates, ServiceType, SubConfiguration, TrackType } from '@/lib/types';
import {
  getMistriCivilRateDisplayEntries,
  parseTileFittingRate,
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
  'Built-Up Area',
]);

/** Per-floor payment milestone recorded on the Mistri agreement (no stage-wise %). */
export const MISTRI_SLAB_PAYMENT_CLAUSE =
  'For each selected floor separately, the Homeowner shall ensure that a minimum of sixty percent (60%) of that floor\'s contracted Head Mason (Mistri) labour cost is paid through the BuilBid payment gateway on or before completion of slab casting of the same floor.';

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
  paymentMilestoneClause: string;
}

function formatRsPerSqft(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'Rs. — / sq. ft.';
  return `Rs. ${Math.round(value).toLocaleString('en-IN')} / sq. ft.`;
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

function buildSiteAddress(
  project: MistriAgreementProjectInput,
  owner: MistriAgreementParty,
): string {
  const parts = [
    owner.address?.trim(),
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

  for (const block of mistri ? getMistriWorkRequirementBlocks(mistri) : []) {
    if (SCOPE_LABELS_EXCLUDED_FROM_AGREEMENT.has(block.label)) continue;
    const key = `${block.label}|${block.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ label: block.label, value: block.value });
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
  const details = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  const isRccStructural = isRccStructuralMistriWork(project);

  const civilFloors = resolveMistriCivilFloors(project);
  const rateEntries = getMistriCivilRateDisplayEntries(bid?.rates, civilFloors);
  const builtUpAreaSqft =
    details?.approximateAreaSqft
    || project.floor_area_sqft
    || civilFloors[0]?.slabAreaSqft
    || 0;
  const tileFittingRate = parseTileFittingRate(bid?.rates);
  const showTileFitting =
    tileFittingRate != null && hasMistriTileFittingScope(details);
  const acceptedRateSqft = rateEntries.length === 1 ? rateEntries[0].rate : 0;
  const acceptedRateLabel =
    rateEntries.length === 1
      ? formatRsPerSqft(rateEntries[0].rate)
      : rateEntries.length > 0
        ? rateEntries.map((entry) => `${entry.label}: ${formatRsPerSqft(entry.rate)}`).join('; ')
        : formatRsPerSqft(0);

  const bidRows: MistriAgreementRow[] = [];
  if (builtUpAreaSqft > 0) {
    bidRows.push({
      label: 'Built-up area (client-specified)',
      value: `${builtUpAreaSqft.toLocaleString('en-IN')} sq. ft. per selected floor`,
    });
  }
  for (const entry of rateEntries) {
    bidRows.push({
      label: `${entry.label} civil work rate`,
      value: formatRsPerSqft(entry.rate),
    });
  }
  if (showTileFitting && tileFittingRate != null) {
    bidRows.push({
      label: 'Tile fitting rate',
      value: `Rs. ${tileFittingRate.toLocaleString('en-IN')} / sq. ft. of floor area`,
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
    siteAddress: buildSiteAddress(project, owner),
    client: owner,
    mistri,
    scopeRows: buildScopeRows(project),
    bidRows,
    contractorRows,
    acceptedRateSqft,
    acceptedRateLabel,
    slabAreaSqft: builtUpAreaSqft,
    slabAreaLabel:
      builtUpAreaSqft > 0 ? `${builtUpAreaSqft.toLocaleString('en-IN')} sq. ft.` : '—',
    districtPincode,
    agreedStartDate: details ? formatMistriStartTime(details) : '—',
    paymentMilestoneClause: MISTRI_SLAB_PAYMENT_CLAUSE,
  };
}

function ensurePage(doc: jsPDF, y: number, need: number, margin: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  y = ensurePage(doc, y, 14, margin);
  doc.setFillColor(15, 118, 110);
  doc.rect(margin, y, doc.internal.pageSize.getWidth() - margin * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255);
  doc.text(title.toUpperCase(), margin + 3, y + 5.5);
  doc.setTextColor(20);
  return y + 12;
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
  let y = startY;

  for (const row of rows) {
    const valueLines = doc.splitTextToSize(row.value || '—', usable - labelW - 4) as string[];
    const rowH = Math.max(8, valueLines.length * 5 + 4);
    y = ensurePage(doc, y, rowH + 1, margin);
    doc.setDrawColor(220);
    doc.rect(margin, y, usable, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40);
    doc.text(row.label, margin + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20);
    doc.text(valueLines, margin + labelW + 2, y + 5);
    y += rowH;
  }
  return y + 6;
}

function drawParagraph(
  doc: jsPDF,
  text: string,
  startY: number,
  margin: number,
  opts?: { bold?: boolean; fill?: [number, number, number] },
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const lines = doc.splitTextToSize(text, usable - 4) as string[];
  const boxH = lines.length * 4.3 + 6;
  const y = ensurePage(doc, startY, boxH + 2, margin);
  if (opts?.fill) {
    doc.setFillColor(...opts.fill);
    doc.rect(margin, y, usable, boxH, 'F');
  }
  doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30);
  doc.text(lines, margin + 2, y + 5);
  return y + boxH + 3;
}

function drawSignatureBlock(doc: jsPDF, startY: number, margin: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const gap = 4;
  const boxW = (usable - gap * 2) / 3;
  const boxH = 38;
  const y = ensurePage(doc, startY, boxH + 4, margin);
  const labels = [
    ['PARTY A: HOMEOWNER', 'Physical Signature / Thumb Impression'],
    ['PARTY B: HEAD MASON (MISTRI)', 'Physical Signature / Thumb Impression'],
    ['WITNESS / BUILBID COORDINATOR', 'Field Coordinator Signature'],
  ];
  labels.forEach((pair, i) => {
    const x = margin + i * (boxW + gap);
    doc.setDrawColor(180);
    doc.rect(x, y, boxW, boxH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(20);
    const title = doc.splitTextToSize(pair[0], boxW - 4) as string[];
    doc.text(title, x + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80);
    const sub = doc.splitTextToSize(pair[1], boxW - 4) as string[];
    doc.text(sub, x + 2, y + 12);
    doc.setDrawColor(120);
    doc.line(x + 4, y + 26, x + boxW - 4, y + 26);
    doc.setFontSize(7);
    doc.text('Date: ____ / ____ / 20__', x + 2, y + 33);
  });
  return y + boxH + 6;
}

/** jsPDF Helvetica cannot render the rupee glyph — keep ASCII. */
export function generateMistriAgreementPdfBytes(payload: MistriAgreementPayload): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255);
  doc.text('BUILBID', margin, 12);
  doc.setFontSize(10);
  doc.text('DIGITAL CONSTRUCTION & LABOUR AGREEMENT FORM', margin, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Head Mason (Mistri / RCC Civil Work)  |  Official platform record', margin, 25);
  y = 36;

  y = drawParagraph(
    doc,
    'Legal Platform Notice: This document is an official digital contract executed directly between the Homeowner and the Head Mason (Mistri). BuilBid operates strictly as a technology marketplace, site coordinator, and payment facilitator. BuilBid is not a direct employer, general contractor, or primary party to the construction work executed on site.',
    y,
    margin,
    { bold: true },
  );

  y = drawSectionTitle(doc, '1. Parties to the Agreement', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Project title', value: payload.projectTitle },
      { label: 'PARTY A — Homeowner (Client) full name', value: nonEmpty(payload.client.name) },
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
      { label: 'PARTY B — Head Mason (Mistri / Contractor)', value: nonEmpty(payload.mistri.companyName || payload.mistri.name) },
      { label: 'Phone / WhatsApp', value: nonEmpty(payload.mistri.mobile) },
      { label: 'builbid ID', value: nonEmpty(payload.mistri.platformId) },
      { label: 'Government ID / GST / Govt Reg No', value: nonEmpty(payload.mistri.gstNumber) },
    ],
    y,
    margin,
  );

  y = drawSectionTitle(doc, '2. Scope of Work & Blueprint Verification', y, margin);
  y = drawParagraph(
    doc,
    'Joint Blueprint Review: Homeowner, Mistri, and BuilBid Field Coordinator must jointly review site blueprints to finalize structural parameters (length, width, depth, and height).',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Excluded Extra / Decorative Work: This agreement strictly covers primary structural labor accepted during bidding. Additional decorative plastering, complex moulding, or elevation designs are excluded. Any extra work must be negotiated independently between Homeowner and Mistri without BuilBid involvement.',
    y,
    margin,
  );
  y = drawRows(doc, payload.scopeRows, y, margin);

  y = drawSectionTitle(doc, '3. Fixed Rates & Payment Terms', y, margin);
  y = drawParagraph(
    doc,
    'Fixed Non-Negotiable Rate: The final bid price accepted on the BuilBid platform is fixed. No bargaining or rate alterations are permitted post-acceptance.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    "Mandatory BuilBid Payment Gateway: All project funds must flow exclusively through BuilBid's official platform account (Homeowner BuilBid Gateway -> Mistri). Cash payments made directly to the Mistri are strictly prohibited and nullify all platform guarantees.",
    y,
    margin,
    { bold: true, fill: [254, 226, 226] },
  );
  y = drawRows(doc, payload.bidRows, y, margin);
  y = drawParagraph(
    doc,
    `Payment Milestone: ${payload.paymentMilestoneClause}`,
    y,
    margin,
    { bold: true },
  );

  y = drawSectionTitle(doc, '4. Timelines, Delays & Penalty Terms', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Agreed start date', value: payload.agreedStartDate },
      { label: 'Agreed completion date', value: 'To be confirmed on-site with the BuilBid Field Coordinator after material availability is verified.' },
      { label: 'Grace extension allowed', value: '10 Calendar Days (Penalty Free)' },
    ],
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Timeline Guidance: The Start Date marks the day physical construction begins on site after material availability is confirmed. The Completion Date represents the mutually agreed deadline set by the Mistri to hand over 100% completed structural work.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Material Supply Obligation: Homeowners must supply all materials on time. Material supply delays by the Homeowner void the on-time project completion guarantee and extend the deadline accordingly.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Mistri Delay Penalty (5% Cut): If the project extends beyond the 10-day grace period due to unexcused delay or absenteeism by the Mistri, a mandatory 5% penalty deduction will be applied to the total contract labor payout through BuilBid.',
    y,
    margin,
    { bold: true, fill: [254, 226, 226] },
  );

  y = drawSectionTitle(doc, '5. Execution & Physical Authorization', y, margin);
  y = drawParagraph(
    doc,
    'This agreement is physically authorized and signed on-site by the Homeowner and Head Mason (Mistri) in the presence of the official BuilBid Field Coordinator.',
    y,
    margin,
  );
  y = drawSignatureBlock(doc, y, margin);

  y = ensurePage(doc, y, 16, margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
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
