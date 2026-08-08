import { jsPDF } from 'jspdf';
import { calculateAssamCostBreakdown, formatInr } from './assamCosts';
import type { CostLineItem } from './costs';
import type { AssamEstimateInputs, AssamEstimateResults } from './types';

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
  const colW = [usable * 0.34, usable * 0.24, usable * 0.2, usable * 0.22];
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

/** Client-side PDF — Assam Type semi-pucca quantities + costs. */
export function downloadAssamEstimatePdf(
  inputs: AssamEstimateInputs,
  results: AssamEstimateResults,
): void {
  const costs = calculateAssamCostBreakdown(inputs, results, inputs.rates);
  const doc = new jsPDF();
  const margin = 14;
  let y = 18;
  const m = results.meta;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text('BuilBid — Assam Type (Semi-pucca) Estimate', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text('Brick to sill/lintel + timber frame + CGI roof (not a structural design)', margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y);
  y += 5;
  doc.text(
    `Wastage ${results.wastagePercent}% · Brick to ${m.brickWallUpTo} · ${inputs.unitType} · ${inputs.floors} floor(s)`,
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
      ['  — Brick mortar (1:6)', String(m.cementBagsBrickMortar), 'bags'],
      ['  — Plaster (walls)', String(m.cementBagsPlaster), 'bags'],
      ['  — PCC pedestals (1:3:6)', String(m.cementBagsPcc), 'bags'],
      ['Sand (total)', String(results.sandCum), 'cum'],
      ['Coarse aggregate (PCC)', String(results.aggregateCum), 'cum'],
      ['Bricks (total)', results.bricks.toLocaleString('en-IN'), 'nos'],
      ['  — Foundation', m.bricksFoundation.toLocaleString('en-IN'), 'nos'],
      ['  — Walls / plinth', m.bricksWalls.toLocaleString('en-IN'), 'nos'],
      ['  — Flooring bed', m.bricksFlooring.toLocaleString('en-IN'), 'nos'],
      ['Timber (total)', String(results.timberCft), 'cft'],
      ['  — Posts', String(m.timberPostsCft), 'cft'],
      ['  — Bands', String(m.timberBandsCft), 'cft'],
      ['  — Roof rafters/purlins', String(m.timberRoofCft), 'cft'],
      ['CGI roofing (sloping)', String(results.cgiAreaSqft), 'sqft'],
      ['Bamboo / mesh panels', String(results.wallPanelAreaSqft), 'sqft'],
    ],
    margin,
  );

  y = renderTable3(
    doc,
    y,
    '2. Structure Summary',
    ['Parameter', 'Value', 'Unit'],
    [
      ['Exterior perimeter', String(m.exteriorPerimeterFt), 'ft'],
      ['Interior wall length', String(m.interiorWallLengthFt), 'ft'],
      ['Brick height (floor up)', String(m.brickWallHeightFt), 'ft'],
      ['Timber post height', String(m.timberPostHeightFt), 'ft'],
      ['Timber posts', String(m.timberPostCount), 'nos'],
      [`Timber bands (${m.bandCount} levels)`, String(m.bandLengthFt), 'ft'],
      ['Roof plan area', String(m.roofPlanSqft), 'sqft'],
      ['CGI pitch factor', String(m.cgiPitchFactor), '—'],
      ['PCC pedestals', String(m.pccPedestalCum), 'cum'],
      ['Plaster surface (both faces)', String(results.plasterAreaSqft), 'sqft'],
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
    '3. Material & Labour Cost (your rates)',
    ['Item', 'Qty', 'Rate', 'Amount'],
    materialCostRows,
    margin,
  );

  y = renderTable4(
    doc,
    y,
    `4. Finishing & Allied Works (standard quality · ${inputs.unitType})`,
    ['Item', 'Basis', 'Rate', 'Amount'],
    costRows(costs.finishingLines, 'Finishing subtotal', costs.finishingTotal),
    margin,
  );

  y = renderTable3(
    doc,
    y,
    '5. Cost Summary',
    ['Head', 'Amount', ''],
    [
      ['Materials', formatInr(costs.materialTotal), ''],
      ['Mistri / labour', formatInr(costs.mistriLabour.amount), ''],
      ['Finishing & allied', formatInr(costs.finishingTotal), ''],
      ['GRAND TOTAL (approx)', formatInr(costs.grandTotal), ''],
      [
        'Rs. / sqft built-up',
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
    '6. Key Project Inputs',
    ['Parameter', 'Value', 'Unit'],
    [
      ['Construction', 'Assam Type (semi-pucca)', '—'],
      ['Unit type', inputs.unitType, '—'],
      ['Floors', String(inputs.floors), 'nos'],
      ['Built-up / floor', String(inputs.builtUpAreaPerFloorSqft), 'sqft'],
      ['Total built-up', String(costs.totalBuiltUpSqft), 'sqft'],
      ['Foundation depth', String(inputs.foundationDepthFt), 'ft'],
      ['Plinth height', String(inputs.plinthHeightFt), 'ft'],
      ['Eaves height', String(inputs.eavesHeightFt), 'ft'],
      ['Brick wall up to', inputs.brickWallUpTo, '—'],
      ['Post spacing', String(inputs.postSpacingM), 'm'],
      ['Rafter spacing', String(inputs.rafterSpacingMm), 'mm'],
      ['Purlin spacing', String(inputs.purlinSpacingMm), 'mm'],
      ['Flooring finish', inputs.rates.flooringFinish, '—'],
    ],
    margin,
  );

  y = ensurePage(doc, y, 28, margin);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Disclaimer: Approximate budgeting estimate for semi-pucca Assam Type (brick plinth/sill or lintel, timber frame, CGI roof) using research-backed thumb rules + client rates. Not a substitute for structural design. Actual tender rates vary by locality, timber grade, and site conditions. Consult a licensed engineer / contractor for final design and quotations.',
    margin,
    y,
    { maxWidth: doc.internal.pageSize.getWidth() - margin * 2 },
  );

  doc.save(`builbid-assam-type-estimate-${Date.now()}.pdf`);
}
