import { jsPDF } from 'jspdf';
import type { BidRates, ServiceType } from '@/lib/types';
import {
  AGREEMENT_MANUAL_DATE_BLANK,
  PAGE_MARGIN_MM,
  cleanAgreementText,
  drawOfficialHeader,
  drawParagraph,
  drawRows,
  drawSectionTitle,
  ensurePage,
  filledAgreementText,
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
  getTradeWorkRequirementBlocks,
  parseTradeDetails,
  plumbingFloorLabel,
} from '@/lib/tradeWorkDetails';
import {
  computePlumbingFixtureBidTotal,
  getPlumbingPointRateDisplayEntries,
  getPlumbingUnitRateDisplayEntries,
  isPlumbingFixtureRateOption,
  parsePlumbingRunningFootRate,
  parsePlumbingUnitRates,
  plumbingFixtureBidContextFromProject,
  plumbingFloorHeightSteps,
  plumbingFloorRateMultiplier,
  readPlumbingPointRateFloors,
  readProjectPlumbingBidOptions,
} from '@/lib/plumberBid';

const FLOOR_RATE_ALLOWANCE_NOTE =
  'Floor-wise rates use the Ground Floor figure as the base rate. 1st Floor is base plus 5%, 2nd Floor is base plus 10%, 3rd Floor is base plus 15%, and each further floor adds another 5%.';

export type PlumberAgreementParty = AgreementParty;
export type PlumberAgreementRow = AgreementRow;

const SCOPE_LABELS_EXCLUDED_FROM_AGREEMENT = new Set([
  'Work Start Time',
  'Work Start Timeline',
  'Start Time',
  'Bidding Options',
  'Billing Notice',
  'Approx. Area',
  'Approximate built-up Area (Sqft)',
  'Approximate Built-up Area (Sqft)',
]);

const FLOOR_RATE_KEYS = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'] as const;

export function isPlumberService(serviceType?: string | null): boolean {
  return (serviceType ?? '').toLowerCase() === 'plumber';
}

export interface PlumberAgreementProjectInput {
  id: string;
  numeric_id?: string | null;
  title: string;
  district: string;
  state?: string | null;
  pincode?: string | null;
  description?: string | null;
  trade_details?: unknown;
  sub_configuration?: unknown;
  service_type?: ServiceType | string | null;
}

export interface PlumberAgreementBidInput {
  id?: string | null;
  single_rate?: number | null;
  total_sum_metric?: number | null;
  rates?: BidRates | Partial<BidRates> | null;
}

export interface PlumberAgreementPayload {
  projectId: string;
  numericProjectId: string;
  projectTitle: string;
  generatedAtLabel: string;
  siteAddress: string;
  client: PlumberAgreementParty;
  plumber: PlumberAgreementParty;
  scopeRows: PlumberAgreementRow[];
  bidRows: PlumberAgreementRow[];
  contractorRows: PlumberAgreementRow[];
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

function buildSiteAddress(project: PlumberAgreementProjectInput): string {
  const parts = [project.district?.trim(), project.state?.trim(), project.pincode?.trim()].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(', ') : '—';
}

function buildScopeRows(project: PlumberAgreementProjectInput): PlumberAgreementRow[] {
  const details = parseTradeDetails(readNestedProjectDetail(project, 'trade_details'));
  if (!details || details.service !== 'plumber') return [];

  const seen = new Set<string>();
  const rows: PlumberAgreementRow[] = [];
  for (const block of getTradeWorkRequirementBlocks(details)) {
    if (SCOPE_LABELS_EXCLUDED_FROM_AGREEMENT.has(block.label)) continue;
    if (/built[- ]?up|approx\.?\s*area|approximate.*area/i.test(block.label)) continue;
    const value = cleanAgreementText(block.value);
    const key = `${block.label}|${value}`;
    if (seen.has(key) || !value) continue;
    seen.add(key);
    rows.push({ label: block.label, value });
  }
  return rows;
}

function buildPlumberBidRows(
  project: PlumberAgreementProjectInput,
  bid: PlumberAgreementBidInput | null,
): PlumberAgreementRow[] {
  const rates = bid?.rates ?? null;
  const pointFloors = readPlumbingPointRateFloors(project);
  if (pointFloors.length > 0) {
    const rows: PlumberAgreementRow[] = getPlumbingPointRateDisplayEntries(rates, pointFloors).map(
      (entry) => ({
        label: `${entry.label} Rate Per Point`,
        value: cleanAgreementText(formatRateWithSuffix(entry.value, entry.suffix)),
      }),
    );
    const runningFoot = parsePlumbingRunningFootRate(rates);
    if (runningFoot != null) {
      rows.push({
        label: 'Long Connection Line (Running Foot)',
        value: cleanAgreementText(formatRateWithSuffix(runningFoot, '/Rft')),
      });
    }
    if (rows.length > 0) return rows;
  }

  const options = readProjectPlumbingBidOptions(project);
  if (options.length > 0 && options.every(isPlumbingFixtureRateOption)) {
    const context = plumbingFixtureBidContextFromProject(project);
    const unitRates = parsePlumbingUnitRates(rates?.unit_rates);
    const floors = context.floors ?? [];
    const floorRows: PlumberAgreementRow[] = [];
    for (const floor of floors) {
      const steps = plumbingFloorHeightSteps(floor.floor, context.customTargetFloors);
      const multiplier = plumbingFloorRateMultiplier(steps);
      const floorLabel = plumbingFloorLabel(
        floor.floor,
        context.customTargetFloors,
        context.houseStructure,
      );
      const allowance = steps <= 0 ? 'Base Rate (100%)' : `Base Rate + ${steps * 5}%`;
      for (const option of options) {
        if (!option.fixtureKind) continue;
        const quantity = floor[option.fixtureKind] ?? 0;
        const baseRate = unitRates[option.id] ?? 0;
        if (quantity <= 0 || baseRate <= 0) continue;
        const floorRate = Math.round(baseRate * multiplier);
        const amount = Math.round(quantity * baseRate * multiplier);
        floorRows.push({
          label: `${floorLabel} - ${option.shortLabel}`,
          value: cleanAgreementText(
            `Qty ${quantity} x ${formatInrAmount(floorRate)} (${allowance}) = ${formatInrAmount(amount)}`,
          ),
        });
      }
    }
    if (floorRows.length > 0) {
      const total = computePlumbingFixtureBidTotal(unitRates, options, context);
      if (total > 0) {
        floorRows.push({
          label: 'Total Estimated Project Cost',
          value: cleanAgreementText(formatInrAmount(total)),
        });
      }
      return floorRows;
    }
  }

  if (options.length > 0) {
    const unitEntries = getPlumbingUnitRateDisplayEntries(rates, options);
    if (unitEntries.length > 0) {
      return unitEntries.map((entry) => ({
        label: entry.label,
        value: cleanAgreementText(formatRateWithSuffix(entry.value, entry.suffix)),
      }));
    }

    const optionRows = options.flatMap((option, index) => {
      const key = FLOOR_RATE_KEYS[index];
      const value = key ? Number(rates?.[key]) : NaN;
      if (!Number.isFinite(value) || value <= 0) return [];
      return [
        {
          label: option.shortLabel || option.label,
          value: cleanAgreementText(formatRateWithSuffix(value, option.unitSuffix)),
        },
      ];
    });
    if (optionRows.length > 0) return optionRows;
  }

  const amount = bid?.single_rate ?? bid?.total_sum_metric;
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    const unit =
      rates?.bid_unit === 'per_running_foot'
        ? '/Rft'
        : rates?.bid_unit === 'per_point'
          ? '/point'
          : '';
    return [
      {
        label: 'Accepted plumber rate',
        value: cleanAgreementText(formatRateWithSuffix(amount, unit)),
      },
    ];
  }

  return [
    {
      label: 'Awarded plumber work',
      value: 'As posted and accepted on BuilBid',
    },
  ];
}

export function buildPlumberAgreementPayload(input: {
  project: PlumberAgreementProjectInput;
  bid: PlumberAgreementBidInput | null;
  owner: PlumberAgreementParty;
  plumber: PlumberAgreementParty;
}): PlumberAgreementPayload {
  const { project, bid, owner, plumber } = input;
  const bidRows = buildPlumberBidRows(project, bid);
  const acceptedRateLabel =
    bidRows.length > 0
      ? bidRows.map((row) => `${row.label}: ${row.value}`).join('; ')
      : 'See awarded bid on BuilBid';

  const contractorRows: PlumberAgreementRow[] = [
    { label: 'Plumber / contractor', value: nonEmpty(plumber.companyName || plumber.name) },
    { label: 'builbid ID', value: formatBuilbidPublicId(plumber.platformId) },
    { label: 'Registered email', value: nonEmpty(plumber.email) },
    { label: 'Mobile / WhatsApp', value: nonEmpty(plumber.mobile) },
    { label: 'Government ID / GST / Govt Reg No', value: nonEmpty(plumber.gstNumber) },
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
    plumber,
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
 * Official signed plumber agreement PDF.
 * Currency uses "Rs." (Helvetica-safe). On-screen/email copy may show ₹.
 */
export function generatePlumberAgreementPdfBytes(
  payload: PlumberAgreementPayload,
  overlay?: DigitalContractOverlay | null,
): Uint8Array {
  const filled = applyOverlayDates(payload, overlay);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = PAGE_MARGIN_MM;
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawOfficialHeader(
    doc,
    margin,
    'Plumber (Plumbing Work)  |  Official platform record',
    'DIGITAL CONSTRUCTION & PLUMBER AGREEMENT',
  );

  y = drawParagraph(
    doc,
    'Legal Notice: This is an official digital contract between the Homeowner and the Plumber. BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
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
      { label: 'PARTY B — Plumber', value: nonEmpty(filled.plumber.companyName || filled.plumber.name) },
      { label: 'Phone / WhatsApp', value: nonEmpty(filled.plumber.mobile) },
      { label: 'builbid ID', value: formatBuilbidPublicId(filled.plumber.platformId) },
      { label: 'Govt ID / GST / Reg No', value: nonEmpty(filled.plumber.gstNumber) },
    ],
    y,
    margin,
  );

  y = drawSectionTitle(doc, '2. Work Specifications & Site Verification', y, margin);
  y = drawParagraph(
    doc,
    'Joint Site Review: Homeowner, Plumber, and BuilBid Field Coordinator must jointly review the site to confirm fixture counts, pipe routing, and running-foot measurements before execution.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Plumber work specifications: All bids are strictly for PLUMBER CHARGES. Materials must be supplied by the Property Owner. Extra bathrooms, decorative fixtures, or work outside the awarded bid must be negotiated separately without BuilBid involvement.',
    y,
    margin,
  );
  y = drawRows(doc, filled.scopeRows, y, margin);

  y = drawSectionTitle(doc, '3. Fixed Rates & Payment Terms', y, margin);
  y = drawParagraph(
    doc,
    'Fixed Non-Negotiable Rate: The final bid price accepted on BuilBid is fixed. No bargaining or rate changes are permitted after acceptance. Final settlement follows actual site measurement at these agreed unit rates.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Mandatory BuilBid Payment Gateway: All funds must flow exclusively through BuilBid (Homeowner -> BuilBid Milestone Escrow -> Plumber). Direct cash payments to the Plumber are strictly prohibited and nullify all platform guarantees.',
    y,
    margin,
    { bold: true, fill: [254, 226, 226], bordered: true },
  );
  y = drawParagraph(doc, FLOOR_RATE_ALLOWANCE_NOTE, y, margin);
  y = drawRows(doc, filled.bidRows, y, margin);
  y = drawRows(
    doc,
    [
      {
        label: 'Approximate Plinth Area (Sq. Ft.)',
        value: filledAgreementText(overlay?.plinthAreaLabel, 'As measured on the site visit'),
      },
      {
        label: 'Total Agreed Project Cost',
        value: filledAgreementText(
          overlay?.totalAgreedCostLabel,
          filled.bidRows.find((row) => row.label === 'Total Estimated Project Cost')?.value
            || filled.acceptedRateLabel,
        ),
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
      { label: 'Grace extension allowed', value: '10 Calendar Days (Penalty Free)' },
    ],
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Timeline: Start Date is when physical plumbing work begins after materials are confirmed on site. Completion Date is the mutually agreed handover deadline for 100% of the awarded Plumber work.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Material Supply: Homeowners must supply plumbing materials on time. Homeowner material delays extend the deadline and void the on-time completion guarantee.',
    y,
    margin,
  );
  y = drawParagraph(
    doc,
    'Plumber Delay Penalty (5%): If the project extends beyond the 10-day grace period due to unexcused Plumber delay or absenteeism, a 5% penalty is deducted from the Plumber payout through BuilBid.',
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
      'Official BuilBid digital agreement for awarded Plumber work. Cash payments outside the BuilBid gateway void platform guarantees.',
    ),
    pageW - margin * 2,
  ) as string[];
  doc.text(footer, margin, y);

  stampAgreementOverlay(doc, overlay);
  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

export function plumberAgreementFileName(projectId: string, numericId?: string | null): string {
  return officialAgreementFileName(projectId, numericId);
}

export function plumberAgreementEmailSubject(projectId: string, numericId?: string | null): string {
  return officialAgreementEmailSubject(projectId, numericId, 'Plumber / Plumbing Work');
}
