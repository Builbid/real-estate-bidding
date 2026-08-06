import { jsPDF } from 'jspdf';
import { MIX_RATIOS, type EstimateInputs, type EstimateResults } from './types';

/** Client-side PDF of the results summary only (not the full input form). */
export function downloadEstimatePdf(inputs: EstimateInputs, results: EstimateResults): void {
  const doc = new jsPDF();
  const margin = 16;
  let y = 20;

  const line = (text: string, size = 11, gap = 7) => {
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += gap;
  };

  doc.setFont('helvetica', 'bold');
  line('BuilBid — Construction Material Estimate', 16, 10);
  doc.setFont('helvetica', 'normal');
  line('Approximate budgeting estimate (not a structural design)', 9, 8);
  line(`Generated: ${new Date().toLocaleString('en-IN')}`, 9, 10);

  doc.setDrawColor(180);
  doc.line(margin, y, 210 - margin, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  line('Summary', 13, 9);
  doc.setFont('helvetica', 'normal');

  line(`Cement: ${results.cementBags} bags`);
  line('Steel (by diameter):');
  for (const row of results.steelByDiameter) {
    line(`  ${row.diameterMm}mm: ${row.quintals} quintals`, 10, 6);
  }
  line(`Total Steel: ${results.totalSteelQuintals} quintals`);
  line(`Coarse Aggregate: ${results.aggregateCum} cum`);
  line(`Sand: ${results.sandCum} cum`);
  line(`Bricks: approx ${results.bricks.toLocaleString('en-IN')} nos`);
  line(`Includes ${results.wastagePercent}% site wastage buffer`, 9, 10);

  doc.setFont('helvetica', 'bold');
  line('Key inputs', 12, 8);
  doc.setFont('helvetica', 'normal');
  line(
    `Floors: ${inputs.floors} · Built-up/floor: ${inputs.builtUpAreaPerFloorSqft} sqft · Unit: ${inputs.unitType}`,
    9,
    6,
  );
  line(
    `Mix: ${MIX_RATIOS[inputs.mixGrade].label} · Columns: ${inputs.columnCount} · Beams: ${inputs.beamCount}`,
    9,
    6,
  );
  line(
    `Concrete volume (raw): ${results.concreteVolumeCum.total} cum (cols ${results.concreteVolumeCum.columns} + beams ${results.concreteVolumeCum.beams} + footings ${results.concreteVolumeCum.footings} + slab ${results.concreteVolumeCum.slab})`,
    9,
    8,
  );

  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    'Disclaimer: Approximate material estimate for budgeting based on standard Indian civil engineering thumb rules. Consult a structural engineer for final design and quantities.',
    margin,
    y,
    { maxWidth: 180 },
  );

  doc.save(`builbid-material-estimate-${Date.now()}.pdf`);
}
