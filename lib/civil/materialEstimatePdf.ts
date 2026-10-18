import { generateProjectDocumentPdfBytes } from '@/lib/documents/pdf';
import {
  estimateCivilMaterials,
  formatMaterialItems,
  isCivilMaterialTrade,
  measuredAreasFromLines,
  type CivilMaterialEstimate,
} from '@/lib/civil/materialEstimate';

const WASTAGE_NOTE =
  'Site wastage tolerance is ±2% to ±5%. Order within that band of the engineered quantities above. No market prices are shown.';

const CODE_NOTE =
  'Codes referenced: IS 456:2000, IS 875, IS 1904, and IS 13920, using the BuilBid G+0 to G+3 Excel RCC footing chart.';

export function civilMaterialEstimateFromChecklist(input: {
  tradeKey: string | null | undefined;
  declaredStoreys?: number | null;
  lines: Array<{ id: string; group: string; unit: string; quantity: number }>;
}): CivilMaterialEstimate | null {
  if (!isCivilMaterialTrade(input.tradeKey)) return null;
  return estimateCivilMaterials({
    measuredFloors: measuredAreasFromLines(input.lines),
    declaredStoreys: input.declaredStoreys,
  });
}

function buildingScopeLabel(estimate: CivilMaterialEstimate): string {
  if (estimate.buildingClass === 'G+4+') return 'G+4 and above';
  return `${estimate.buildingClass} frame`;
}

function technicalBasisLines(estimate: CivilMaterialEstimate): string[] {
  const lines: string[] = [];
  if (estimate.engineerRequired) {
    lines.push(estimate.chartSummary);
  } else {
    lines.push(estimate.chartSummary);
    lines.push(
      `${estimate.footingCount} footings under a ${estimate.planSqft.toLocaleString('en-IN')} sq. ft. plan.`,
    );
  }
  lines.push(...estimate.assumptions);
  lines.push(CODE_NOTE);
  return lines;
}

export function civilMaterialEstimatePdfBytes(input: {
  tradeKey: string | null | undefined;
  declaredStoreys?: number | null;
  lines: Array<{ id: string; group: string; unit: string; quantity: number }>;
  projectName: string;
  numericProjectId: string;
  ownerName: string;
  workerName: string;
  /** Checklist soil label, for example "Normal Earth / Soil". */
  soilCondition?: string | null;
}): Uint8Array | null {
  const estimate = civilMaterialEstimateFromChecklist(input);
  if (!estimate) return null;
  const soil = input.soilCondition?.trim() || '—';
  return generateProjectDocumentPdfBytes({
    title: 'BuilBid Official Civil Material Requirement Estimate',
    subtitle: 'Cement, TMT, sand, aggregate, and bricks from the site checklist',
    numericProjectId: input.numericProjectId || 'Project',
    projectName: input.projectName,
    rows: [
      { label: 'Building class / scope', value: buildingScopeLabel(estimate) },
      { label: 'Soil condition', value: soil },
      { label: 'Homeowner', value: input.ownerName || '—' },
      { label: 'Worker', value: input.workerName || '—' },
    ],
    bulletSection: {
      heading: 'Total civil material breakdown',
      intro: 'Complete structure from foundation to roof for the selected storeys.',
      lines: formatMaterialItems(estimate.totals),
      note: WASTAGE_NOTE,
    },
    callout: {
      title: 'Technical Details & Calculation Basis',
      lines: technicalBasisLines(estimate),
    },
  });
}
