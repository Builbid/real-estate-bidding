import { generateProjectDocumentPdfBytes } from '@/lib/documents/pdf';
import {
  estimateCivilMaterials,
  formatMaterialLine,
  isCivilMaterialTrade,
  measuredAreasFromLines,
  type CivilMaterialEstimate,
} from '@/lib/civil/materialEstimate';

const WASTAGE_NOTE =
  'Site wastage tolerance is ±2% to ±5%. Order within that band of the engineered quantities above. No market prices are shown. Codes referenced: IS 456:2000, IS 875, IS 1904, and IS 13920, using the BuilBid G+0 to G+3 Excel RCC footing chart.';

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

export function civilMaterialEstimatePdfBytes(input: {
  tradeKey: string | null | undefined;
  declaredStoreys?: number | null;
  lines: Array<{ id: string; group: string; unit: string; quantity: number }>;
  projectName: string;
  numericProjectId: string;
  ownerName: string;
  workerName: string;
}): Uint8Array | null {
  const estimate = civilMaterialEstimateFromChecklist(input);
  if (!estimate) return null;
  const rows = [
    { label: 'Homeowner', value: input.ownerName || '—' },
    { label: 'Mistri / worker', value: input.workerName || '—' },
    { label: 'Building class', value: `${estimate.buildingClass} · ${estimate.storeys} storey` },
    { label: 'Chart used', value: estimate.chartSummary },
    {
      label: 'Footings placed',
      value: estimate.engineerRequired
        ? 'Not calculated — structural engineer required for G+4 and above.'
        : `${estimate.footingCount} footings under a ${estimate.planSqft.toLocaleString('en-IN')} sq. ft. plan`,
    },
    { label: 'Foundation quantities', value: formatMaterialLine(estimate.foundation) },
    ...estimate.floors.flatMap((floor) => [
      {
        label: floor.group,
        value: `${floor.sqft.toLocaleString('en-IN')} sq. ft. measured plinth`,
      },
      { label: `${floor.group} materials`, value: formatMaterialLine(floor.materials) },
    ]),
    { label: 'Total engineered quantities', value: formatMaterialLine(estimate.totals) },
    ...estimate.assumptions.map((note, index) => ({
      label: index === 0 ? 'How the quantities were built' : '',
      value: note,
    })),
  ];
  return generateProjectDocumentPdfBytes({
    title: 'BuilBid Official Civil Material Requirement Estimate',
    subtitle: 'Cement, TMT, sand, aggregate, and bricks from the site checklist',
    numericProjectId: input.numericProjectId || 'Project',
    projectName: input.projectName,
    notice: WASTAGE_NOTE,
    rows,
  });
}
