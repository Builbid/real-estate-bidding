import { jsPDF } from 'jspdf';
import { calculateCostBreakdown, formatInr, type CostBreakdown, type CostLineItem } from './costs';
import { MIX_RATIOS, type EstimateInputs, type EstimateResults } from './types';

type Row3 = [string, string, string];
type Row4 = [string, string, string, string];

function ensurePage(doc: jsPDF, y: number, need: number, margin: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

function renderTable3(
  doc: jsPDF,
  startY: number,
  title: string,
  headers: Row3,
  rows: Row3[],
  margin: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const colW = [usable * 0.46, usable * 0.32, usable * 0.22];
  const rowH = 8;
  let y = startY;

  y = ensurePage(doc, y, 20, margin);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(title, margin, y);
  y += 6;

  const drawRow = (cells: Row3, header: boolean) => {
    y = ensurePage(doc, y, rowH + 2, margin);
    const x0 = margin;
    if (header) {
      doc.setFillColor(30, 120, 90);
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFillColor(248, 250, 249);
      doc.setTextColor(30);
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(9);
    doc.rect(x0, y, usable, rowH, header ? 'F' : 'S');
    let x = x0 + 2;
    doc.text(cells[0], x, y + 5.5);
    x = x0 + colW[0] + 2;
    doc.text(cells[1], x, y + 5.5);
    x = x0 + colW[0] + colW[1] + 2;
    doc.text(cells[2], x, y + 5.5);
    doc.setDrawColor(200);
    doc.line(x0 + colW[0], y, x0 + colW[0], y + rowH);
    doc.line(x0 + colW[0] + colW[1], y, x0 + colW[0] + colW[1], y + rowH);
    y += rowH;
  };

  drawRow(headers, true);
  for (const row of rows) drawRow(row, false);
  return y + 6;
}

function renderTable4(
  doc: jsPDF,
  startY: number,
  title: string,
  headers: Row4,
  rows: Row4[],
  margin: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const colW = [usable * 0.34, usable * 0.24, usable * 0.20, usable * 0.22];
  const rowH = 8;
  let y = startY;

  y = ensurePage(doc, y, 20, margin);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(title, margin, y);
  y += 6;

  const drawRow = (cells: Row4, header: boolean) => {
    y = ensurePage(doc, y, rowH + 2, margin);
    const x0 = margin;
    if (header) {
      doc.setFillColor(30, 120, 90);
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFillColor(248, 250, 249);
      doc.setTextColor(30);
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(8);
    doc.rect(x0, y, usable, rowH, header ? 'F' : 'S');
    let x = x0 + 2;
    doc.text(cells[0].slice(0, 32), x, y + 5.5);
    x = x0 + colW[0] + 2;
    doc.text(cells[1].slice(0, 22), x, y + 5.5);
    x = x0 + colW[0] + colW[1] + 2;
    doc.text(cells[2].slice(0, 18), x, y + 5.5);
    x = x0 + colW[0] + colW[1] + colW[2] + 2;
    doc.text(cells[3].slice(0, 18), x, y + 5.5);
    doc.setDrawColor(200);
    doc.line(x0 + colW[0], y, x0 + colW[0], y + rowH);
    doc.line(x0 + colW[0] + colW[1], y, x0 + colW[0] + colW[1], y + rowH);
    doc.line(
      x0 + colW[0] + colW[1] + colW[2],
      y,
      x0 + colW[0] + colW[1] + colW[2],
      y + rowH,
    );
    y += rowH;
  };

  drawRow(headers, true);
  for (const row of rows) drawRow(row, false);
  return y + 6;
}

function costRows(lines: CostLineItem[], totalLabel: string, total: number): Row4[] {
  const rows: Row4[] = lines.map((l) => [
    l.label,
    l.quantityLabel,
    l.rateLabel,
    formatInr(l.amount),
  ]);
  rows.push([totalLabel, '', '', formatInr(total)]);
  return rows;
}

/** Client-side PDF — quantities + rates + finishing costs. */
export function downloadEstimatePdf(inputs: EstimateInputs, results: EstimateResults): void {
  const costs: CostBreakdown = calculateCostBreakdown(inputs, results, inputs.rates);
  const doc = new jsPDF();
  const margin = 14;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text('BuilBid — Material & Cost Estimate', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text('Approximate budgeting estimate (not a structural design)', margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y);
  y += 5;
  doc.text(
    `Wastage ${results.wastagePercent}% · Spacing ${results.meta.standardSpacingMm} mm · Lap ${results.meta.lapMultiplier}×d · ${inputs.unitType} · ${inputs.floors} floor(s)`,
    margin,
    y,
  );
  y += 8;

  y = renderTable3(
    doc,
    y,
    '1. Material Quantities',
    ['Item', 'Quantity', 'Unit'],
    [
      ['Cement (total)', String(results.cementBags), 'bags'],
      ['  — RCC concrete', String(results.meta.cementBagsRcc), 'bags'],
      ['  — Brick mortar (1:6)', String(results.meta.cementBagsBrickMortar), 'bags'],
      ['  — Plaster walls + ceiling', String(results.meta.cementBagsPlaster), 'bags'],
      ['Sand (total)', String(results.sandCum), 'cum'],
      ['Coarse aggregate (Giti)', String(results.aggregateCum), 'cum'],
      ['Bricks (total)', results.bricks.toLocaleString('en-IN'), 'nos'],
      ['  — Walls', results.meta.bricksWalls.toLocaleString('en-IN'), 'nos'],
      ['  — Foundation soling', results.meta.bricksFoundationSoling.toLocaleString('en-IN'), 'nos'],
      ['  — Flooring bed', results.meta.bricksFlooring.toLocaleString('en-IN'), 'nos'],
      ['Total steel', String(results.totalSteelQuintals), 'quintals'],
    ],
    margin,
  );

  const steelRows: Row3[] = results.steelByDiameter.map((r) => [
    `${r.diameterMm} mm bars`,
    String(r.quintals),
    'quintals',
  ]);
  if (steelRows.length === 0) steelRows.push(['—', '0', 'quintals']);
  y = renderTable3(doc, y, '2. Steel by Diameter', ['Diameter', 'Quantity', 'Unit'], steelRows, margin);

  y = renderTable3(
    doc,
    y,
    '3. Concrete Volume',
    ['Member', 'Volume', 'Unit'],
    [
      ['Columns', String(results.concreteVolumeCum.columns), 'cum'],
      ['Floor / slab beams', String(results.concreteVolumeCum.beams), 'cum'],
      ['Plinth / ground beams', String(results.concreteVolumeCum.plinthBeams), 'cum'],
      [
        `Lintels (${results.meta.lintelLengthFt} ft wall length)`,
        String(results.concreteVolumeCum.lintels),
        'cum',
      ],
      ['Footings', String(results.concreteVolumeCum.footings), 'cum'],
      ['Slab', String(results.concreteVolumeCum.slab), 'cum'],
      ['Staircase', String(results.concreteVolumeCum.staircase), 'cum'],
      ['Total concrete', String(results.concreteVolumeCum.total), 'cum'],
    ],
    margin,
  );

  const materialCostRows = costRows(
    [...costs.materialLines, costs.mistriLabour],
    'Materials + mistri subtotal',
    costs.materialTotal + costs.mistriLabour.amount,
  );
  y = renderTable4(
    doc,
    y,
    '4. Material & Labour Cost (your rates)',
    ['Item', 'Qty', 'Rate', 'Amount'],
    materialCostRows,
    margin,
  );

  y = renderTable4(
    doc,
    y,
    `5. Finishing & Allied Works (standard quality · ${inputs.unitType})`,
    ['Item', 'Basis', 'Rate', 'Amount'],
    costRows(costs.finishingLines, 'Finishing subtotal', costs.finishingTotal),
    margin,
  );

  y = renderTable3(
    doc,
    y,
    '6. Cost Summary',
    ['Head', 'Amount', ''],
    [
      ['Materials', formatInr(costs.materialTotal), ''],
      ['Mistri / labour', formatInr(costs.mistriLabour.amount), ''],
      ['Finishing & allied', formatInr(costs.finishingTotal), ''],
      ['GRAND TOTAL (approx)', formatInr(costs.grandTotal), ''],
      [
        '₹ / sqft built-up',
        costs.totalBuiltUpSqft > 0
          ? formatInr(Math.round(costs.grandTotal / costs.totalBuiltUpSqft))
          : '—',
        '',
      ],
    ],
    margin,
  );

  y = renderTable3(
    doc,
    y,
    '7. Key Project Inputs',
    ['Parameter', 'Value', 'Unit'],
    [
      ['Unit type', inputs.unitType, '—'],
      ['Floors', String(inputs.floors), 'nos'],
      ['Built-up / floor', String(inputs.builtUpAreaPerFloorSqft), 'sqft'],
      ['Total built-up', String(costs.totalBuiltUpSqft), 'sqft'],
      ['Slab area / floor', String(inputs.slabAreaPerFloorSqft), 'sqft'],
      ['Foundation depth', String(inputs.foundationDepthFt), 'ft'],
      ['Plinth height', String(inputs.plinthHeightFt), 'ft'],
      ['Floor-to-floor height', String(inputs.floorToFloorHeightFt), 'ft'],
      ['Concrete mix', MIX_RATIOS[inputs.mixGrade].label, '—'],
      ['Flooring finish', inputs.rates.flooringFinish, '—'],
      [
        'Wall area (ext + int)',
        `${results.meta.exteriorWallAreaSqft} + ${results.meta.interiorWallAreaSqft}`,
        'sqft',
      ],
    ],
    margin,
  );

  y = ensurePage(doc, y, 28, margin);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Disclaimer: Approximate budgeting estimate using Indian civil thumb rules + client item rates. Finishing costs assume standard-quality materials (not premium). Actual tender rates vary by locality, brand, and site conditions. Consult a structural engineer / licensed contractor for final design and quotations.',
    margin,
    y,
    { maxWidth: doc.internal.pageSize.getWidth() - margin * 2 },
  );

  doc.save(`builbid-material-estimate-${Date.now()}.pdf`);
}
