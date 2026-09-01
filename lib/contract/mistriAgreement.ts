import { jsPDF } from 'jspdf';
import {
  getBidFloorRateEntries,
  resolveProjectBidFloors,
} from '@/lib/bid/floorRateDisplay';
import {
  formatBuildingTypesSummary,
  isStructuralConstructionType,
  type BuildingType,
  type ConstructionTypeValue,
  type ConstructionTypesMap,
} from '@/lib/buildingConfig';
import {
  getMistriWorkRequirementBlocks,
  hasAssamMistriFloorWork,
  isAssamMistriFloor,
  parseMistriDetails,
  type MistriCivilWorkType,
  type MistriFloorWorkType,
} from '@/lib/mistriDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import type { BidRates, ServiceType, SubConfiguration, TrackType } from '@/lib/types';
import { averageFromSumMetric, getConstructionLabel, TRACK_LABELS } from '@/lib/utils';

/** Official BuilBid inboxes that receive signed mistri agreements (never client or mistri). */
export const BUILBID_OFFICIAL_AGREEMENT_EMAILS = [
  'official@builbid.in',
  'contact@builbid.in',
] as const;

const STRUCTURAL_CIVIL_TYPES: ReadonlySet<string> = new Set<MistriCivilWorkType | string>([
  'complete_full_structure',
  'foundation_concrete_structure',
  'rcc_column_beam_slab',
]);

const STRUCTURAL_FLOOR_WORK: ReadonlySet<MistriFloorWorkType> = new Set([
  'full_finished',
  'frame_skeleton',
]);

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
  totalLaborCost: number;
  totalLaborLabel: string;
  rccRateClause: string;
}

function formatRs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'Rs. —';
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`;
}

function formatRsPerSqft(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'Rs. — / sq. ft.';
  return `Rs. ${Math.round(value).toLocaleString('en-IN')} / sq. ft. of slab area`;
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

function buildDimensionRows(project: MistriAgreementProjectInput): MistriAgreementRow[] {
  const rows: MistriAgreementRow[] = [];
  const mistri = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  const buildingTypes = (project.building_types ?? []).filter(
    (type): type is BuildingType => typeof type === 'string' && type.length > 0,
  );

  if (buildingTypes.length > 0) {
    rows.push({ label: 'Building type(s)', value: formatBuildingTypesSummary(buildingTypes) });
  } else {
    rows.push({
      label: 'Building type(s)',
      value: TRACK_LABELS[project.track_type] ?? project.track_type,
    });
  }

  const floors = resolveProjectBidFloors({
    track_type: project.track_type,
    total_floors: project.total_floors,
    sub_configuration: project.sub_configuration,
    building_types: project.building_types,
    mistri_details: project.mistri_details,
  });
  rows.push({
    label: 'Floor count / selected floors',
    value: `${floors.count} — ${floors.labels.join(', ') || '—'}`,
  });

  if (mistri?.currentFloorPlan) {
    rows.push({ label: 'Current floor plan', value: mistri.currentFloorPlan });
  }
  if (mistri?.futureFloorPlan) {
    rows.push({ label: 'Foundation provision (future floors)', value: mistri.futureFloorPlan });
  }

  const constructionTypes = project.construction_types ?? {};
  const constructionLines = Object.entries(constructionTypes)
    .filter(([, value]) => Boolean(value))
    .map(([type, value]) => `${type}: ${value}`);
  if (constructionLines.length > 0) {
    rows.push({ label: 'Construction scope', value: constructionLines.join(' | ') });
  } else {
    rows.push({
      label: 'Construction scope',
      value: getConstructionLabel(
        project.track_type,
        (project.sub_configuration ?? {}) as SubConfiguration,
      ),
    });
  }

  const slabArea = mistri?.approximateAreaSqft || project.floor_area_sqft || 0;
  if (slabArea > 0) {
    rows.push({
      label: 'Slab / work area',
      value: `${slabArea.toLocaleString('en-IN')} sq. ft.`,
    });
  }
  if (project.plot_area_sqft && project.plot_area_sqft > 0) {
    rows.push({
      label: 'Plot area',
      value: `${project.plot_area_sqft.toLocaleString('en-IN')} sq. ft.`,
    });
  }

  const assamWork = mistri?.floorWork?.find((fw) => isAssamMistriFloor(fw.floorId));
  if (assamWork?.foundationDepthFt && assamWork.foundationDepthFt > 0) {
    rows.push({
      label: 'Foundation depth (height spec)',
      value: `${assamWork.foundationDepthFt} ft`,
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
  const details = parseMistriDetails(readNestedProjectDetail(project, 'mistri_details'));
  const isRccStructural = isRccStructuralMistriWork(project);
  const scopeFromRequirements = (details ? getMistriWorkRequirementBlocks(details) : []).map(
    (block) => ({ label: block.label, value: block.value }),
  );

  const floors = resolveProjectBidFloors({
    track_type: project.track_type,
    total_floors: project.total_floors,
    sub_configuration: project.sub_configuration,
    building_types: project.building_types,
    mistri_details: project.mistri_details,
  });
  const floorRates = getBidFloorRateEntries(bid?.rates, floors.labels);
  const floorCount = Math.max(floorRates.length || floors.count || 1, 1);
  const sumMetric = Number(bid?.total_sum_metric ?? 0);
  const singleRate = Number(bid?.single_rate ?? 0);
  const acceptedRateSqft =
    singleRate > 0
      ? singleRate
      : floorRates.length === 1
        ? floorRates[0].value
        : averageFromSumMetric(sumMetric, floorCount);

  const slabAreaSqft = details?.approximateAreaSqft || project.floor_area_sqft || 0;
  const totalLaborCost = acceptedRateSqft > 0 && slabAreaSqft > 0 ? acceptedRateSqft * slabAreaSqft : 0;

  const bidRows: MistriAgreementRow[] = [
    { label: 'Accepted rate per sq. ft. of slab area', value: formatRsPerSqft(acceptedRateSqft) },
    {
      label: 'Total slab area (client-specified)',
      value: slabAreaSqft > 0 ? `${slabAreaSqft.toLocaleString('en-IN')} sq. ft.` : '—',
    },
    {
      label: 'Calculated total labour cost',
      value: `${formatRs(totalLaborCost)}${isRccStructural ? '  (rate x slab area)' : ''}`,
    },
  ];

  if (floorRates.length > 1) {
    for (const entry of floorRates) {
      bidRows.push({
        label: `${entry.label} bid rate`,
        value: `Rs. ${entry.value.toLocaleString('en-IN')} / sq. ft.`,
      });
    }
  }

  const contractorRows: MistriAgreementRow[] = [
    { label: 'Head Mason / contractor', value: nonEmpty(mistri.companyName || mistri.name) },
    { label: 'Platform account name', value: nonEmpty(mistri.name) },
    { label: 'Registered email', value: nonEmpty(mistri.email) },
    { label: 'Mobile', value: nonEmpty(mistri.mobile) },
    { label: 'Address', value: nonEmpty(mistri.address) },
    { label: 'GST', value: nonEmpty(mistri.gstNumber) },
    {
      label: 'Years on record',
      value:
        mistri.yearsInBusiness != null && mistri.yearsInBusiness > 0
          ? String(mistri.yearsInBusiness)
          : '—',
    },
    { label: 'BuilBid verification', value: mistri.isVerified ? 'Verified on BuilBid' : 'Unverified' },
  ];

  const seen = new Set<string>();
  const scopeRows: MistriAgreementRow[] = [];
  for (const row of [...buildDimensionRows(project), ...scopeFromRequirements]) {
    const key = `${row.label}|${row.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scopeRows.push(row);
  }

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
    scopeRows,
    bidRows,
    contractorRows,
    acceptedRateSqft,
    acceptedRateLabel: formatRsPerSqft(acceptedRateSqft),
    slabAreaSqft,
    slabAreaLabel:
      slabAreaSqft > 0 ? `${slabAreaSqft.toLocaleString('en-IN')} sq. ft.` : '—',
    totalLaborCost,
    totalLaborLabel: formatRs(totalLaborCost),
    rccRateClause:
      'For RCC structural work, the Head Mason (Mistri) labour rate is strictly calculated on a per sq. ft. of slab area basis. The accepted rate applies to the client-specified slab area. Total labour cost = Accepted Rate per Sq. Ft. of Slab Area x Total Slab Area. This basis does not apply to non-structural finishing-only packages (brickwork, plastering, or flooring without RCC frame/slab).',
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
  doc.setFontSize(10);
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

/** jsPDF Helvetica cannot render the rupee glyph — keep ASCII. */
export function generateMistriAgreementPdfBytes(payload: MistriAgreementPayload): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255);
  doc.text('BuilBid', margin, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Construction Agreement — Head Mason (Mistri / Civil Work)', margin, 20);
  y = 36;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Agreement of Labour Work', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60);
  const intro = doc.splitTextToSize(
    `This record is generated automatically when the client awards a Head Mason (Mistri) bid on BuilBid. It captures the project scope selected at posting and the accepted winning bid. It is issued for BuilBid official records.`,
    pageW - margin * 2,
  ) as string[];
  doc.text(intro, margin, y);
  y += intro.length * 4.5 + 4;

  y = drawSectionTitle(doc, 'Document', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Project ID', value: payload.projectId },
      { label: 'Project title', value: payload.projectTitle },
      { label: 'Generated (IST)', value: payload.generatedAtLabel },
      { label: 'Service category', value: 'Mistri / Civil Work (Head Mason)' },
    ],
    y,
    margin,
  );

  y = drawSectionTitle(doc, 'Parties', y, margin);
  y = drawRows(
    doc,
    [
      { label: 'Client name', value: nonEmpty(payload.client.name) },
      { label: 'Client email', value: nonEmpty(payload.client.email) },
      { label: 'Client mobile', value: nonEmpty(payload.client.mobile) },
      { label: 'Head Mason (Mistri)', value: nonEmpty(payload.mistri.companyName || payload.mistri.name) },
      { label: 'Mistri email', value: nonEmpty(payload.mistri.email) },
      { label: 'Mistri mobile', value: nonEmpty(payload.mistri.mobile) },
      { label: 'Site address', value: payload.siteAddress },
    ],
    y,
    margin,
  );

  y = drawSectionTitle(doc, 'Scope of Work (as selected by client)', y, margin);
  y = drawRows(doc, payload.scopeRows, y, margin);

  if (payload.isRccStructural) {
    y = drawSectionTitle(doc, 'RCC Structural Work — Rate Basis', y, margin);
    y = ensurePage(doc, y, 28, margin);
    doc.setFillColor(254, 243, 199);
    const clauseLines = doc.splitTextToSize(payload.rccRateClause, pageW - margin * 2 - 6) as string[];
    const boxH = clauseLines.length * 4.4 + 8;
    doc.rect(margin, y, pageW - margin * 2, boxH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 53, 15);
    doc.text(clauseLines, margin + 3, y + 6);
    y += boxH + 8;
  }

  y = drawSectionTitle(doc, 'Winning Bid — Commercials', y, margin);
  y = drawRows(doc, payload.bidRows, y, margin);

  y = drawSectionTitle(doc, 'Contractor Platform Details', y, margin);
  y = drawRows(doc, payload.contractorRows, y, margin);

  y = ensurePage(doc, y, 22, margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  const footer = doc.splitTextToSize(
    'This PDF is an official BuilBid platform record of the awarded Mistri / civil work bid. A stamped legal construction contract, if required, is executed separately between the parties. Generated for official@builbid.in / contact@builbid.in only.',
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
