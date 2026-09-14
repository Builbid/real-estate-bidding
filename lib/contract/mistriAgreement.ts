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
  MISTRI_APPROXIMATE_AREA_LABEL,
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
import {
  AGREEMENT_MANUAL_DATE_BLANK,
  BUILBID_CORP_GMAIL,
  BUILBID_OFFICIAL_AGREEMENT_EMAILS,
  PAGE_MARGIN_MM,
  cleanAgreementText,
  drawOfficialHeader,
  drawParagraph,
  drawRows,
  drawSectionTitle,
  drawSignatureBlock,
  ensurePage,
  formatBuilbidPublicId,
  formatInrAmount,
  nonEmpty,
  numericProjectId,
  officialAgreementEmailSubject,
  officialAgreementFileName,
  type AgreementParty,
  type AgreementRow,
} from '@/lib/contract/agreementPdf';

export {
  AGREEMENT_MANUAL_DATE_BLANK,
  BUILBID_CORP_GMAIL,
  BUILBID_OFFICIAL_AGREEMENT_EMAILS,
  formatBuilbidPublicId,
};

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
  MISTRI_APPROXIMATE_AREA_LABEL,
]);

export function isMistriCivilService(serviceType?: string | null): boolean {
  const value = (serviceType ?? 'labour_contractor').toLowerCase();
  return value === 'labour_contractor' || value === 'mistri' || value === 'civil_construction';
}

export interface MistriAgreementProjectInput {
  id: string;
  /** Short numeric-only project ID shared by all project documents. */
  numeric_id?: string | null;
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

export type MistriAgreementParty = AgreementParty;

export interface MistriAgreementBidInput {
  id?: string | null;
  single_rate?: number | null;
  total_sum_metric?: number | null;
  rates?: BidRates | Partial<BidRates> | null;
}

export type MistriAgreementRow = AgreementRow;

export interface MistriAgreementPayload {
  projectId: string;
  numericProjectId: string;
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

function formatCivilRatePerSlab(value: number): string {
  return `${formatInrAmount(value)} / sq. ft. of slab area`;
}

function formatWallRatePerWall(value: number): string {
  return `${formatInrAmount(value)} / sq. ft. of wall area`;
}

function formatFlooringRatePerFloor(value: number): string {
  return `${formatInrAmount(value)} / sq. ft. of floor area`;
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
    { label: 'builbid ID', value: formatBuilbidPublicId(mistri.platformId) },
    { label: 'Registered email', value: nonEmpty(mistri.email) },
    { label: 'Mobile / WhatsApp', value: nonEmpty(mistri.mobile) },
    { label: 'Government ID / GST / Govt Reg No', value: nonEmpty(mistri.gstNumber) },
  ];

  const districtPincode = [project.district?.trim(), project.pincode?.trim()]
    .filter(Boolean)
    .join(' / ') || '—';

  return {
    projectId: project.id,
    numericProjectId: numericProjectId(project.numeric_id),
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

/**
 * Official signed mistri agreement PDF.
 * Currency uses "Rs." (Helvetica-safe). On-screen/email copy may show ₹.
 */
export function generateMistriAgreementPdfBytes(payload: MistriAgreementPayload): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = PAGE_MARGIN_MM;
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawOfficialHeader(
    doc,
    margin,
    'Head Mason (Mistri / RCC Civil Work)  |  Official platform record',
  );

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
      { label: 'Project ID', value: payload.numericProjectId || '—' },
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
      { label: 'builbid ID', value: formatBuilbidPublicId(payload.mistri.platformId) },
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

export function mistriAgreementFileName(projectId: string, numericId?: string | null): string {
  return officialAgreementFileName(projectId, numericId);
}

export function mistriAgreementEmailSubject(projectId: string, numericId?: string | null): string {
  return officialAgreementEmailSubject(projectId, numericId, 'Mistri / Civil Work');
}
