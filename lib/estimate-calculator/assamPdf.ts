import { jsPDF } from 'jspdf';
import { calculateAssamCostBreakdown, formatInr } from './assamCosts';
import type { CostLineItem } from './costs';
import { MIX_RATIOS, type AssamEstimateInputs, type AssamEstimateResults } from './types';

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

export function downloadAssamEstimatePdf(
  inputs: AssamEstimateInputs,
  results: AssamEstimateResults,
): void {
  const costs = calculateAssamCostBreakdown(inputs, results, inputs.rates);
  const doc = new jsPDF();
  const margin = 14;
  let y = 18;
  const m = results.meta;
  const trussLabel =
    inputs.trussType === 'rcc_king_post'
      ? 'RCC King Post truss'
      : inputs.trussType === 'steel'
        ? 'Steel roof truss'
        : 'Timber truss';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text('BuilBid — Assam Type House Estimate', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    'Single storey: RCC footing/columns/plinth/lintel + 5" brick + tin roof (no slab / floor beams)',
    margin,
    y,
  );
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y);
  y += 5;
  doc.text(
    `Wastage ${results.wastagePercent}% · ${trussLabel} · ${inputs.unitType} · ${MIX_RATIOS[inputs.mixGrade].label}`,
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
      ['  — RCC concrete', String(m.cementBagsRcc), 'bags'],
      ['  — Brick mortar (1:6)', String(m.cementBagsBrickMortar), 'bags'],
      ['  — Wall plaster', String(m.cementBagsPlaster), 'bags'],
      ['Sand (total)', String(results.sandCum), 'cum'],
      ['Coarse aggregate (Giti)', String(results.aggregateCum), 'cum'],
      ['Bricks (total)', results.bricks.toLocaleString('en-IN'), 'nos'],
      ['  — Walls (9" plinth + 5")', m.bricksWalls.toLocaleString('en-IN'), 'nos'],
      ['  — Foundation soling', m.bricksFoundationSoling.toLocaleString('en-IN'), 'nos'],
      ['  — Flooring bed', m.bricksFlooring.toLocaleString('en-IN'), 'nos'],
      ['Total steel', String(results.totalSteelQuintals), 'quintals'],
      ['Tin roof (Dyna / Tata CGI)', String(results.tinRoofAreaSqft), 'sqft'],
      ...(results.timberCft > 0
        ? [['Timber truss', String(results.timberCft), 'cft'] as Row3]
        : []),
      ...(results.steelTrussKg > 0
        ? [['Steel roof truss', String(results.steelTrussKg), 'kg'] as Row3]
        : []),
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
    '3. Concrete Volume (no slab / floor beams)',
    ['Member', 'Volume', 'Unit'],
    [
      ['Columns', String(results.concreteVolumeCum.columns), 'cum'],
      ['Plinth / ground beams', String(results.concreteVolumeCum.plinthBeams), 'cum'],
      [`Lintels (${m.lintelLengthFt} ft)`, String(results.concreteVolumeCum.lintels), 'cum'],
      ['Footings', String(results.concreteVolumeCum.footings), 'cum'],
      [
        inputs.trussType === 'rcc_king_post'
          ? `RCC king-post trusses (${m.trussCount} nos)`
          : inputs.trussType === 'steel'
            ? `Steel roof trusses (${m.trussCount} nos — see steel truss kg)`
            : 'Trusses (timber — see timber qty)',
        String(results.concreteVolumeCum.trusses),
        'cum',
      ],
      ['Total concrete', String(results.concreteVolumeCum.total), 'cum'],
    ],
    margin,
  );

  y = renderTable4(
    doc,
    y,
    '4. Material & Labour Cost (your rates)',
    ['Item', 'Qty', 'Rate', 'Amount'],
    costRows(
      [...costs.materialLines, costs.mistriLabour],
      'Materials + mistri subtotal',
      costs.materialTotal + costs.mistriLabour.amount,
    ),
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
    '7. Key Project Inputs',
    ['Parameter', 'Value', 'Unit'],
    [
      ['Construction', 'Assam Type (single storey)', '—'],
      ['Unit type', inputs.unitType, '—'],
      ['Built-up area', String(inputs.builtUpAreaSqft), 'sqft'],
      ['Foundation depth', String(inputs.foundationDepthFt), 'ft'],
      ['Plinth height (9" brick)', String(inputs.plinthHeightFt), 'ft'],
      ['Wall height (5" brick)', String(inputs.wallHeightFt), 'ft'],
      ['Columns', String(inputs.columnCount), 'nos'],
      ['Plinth beams', String(inputs.plinthBeamCount), 'nos'],
      ['Truss type', trussLabel, '—'],
      ['Truss count / span', `${m.trussCount} / ${m.trussSpanFt}`, 'nos / ft'],
      ['Tin pitch factor', String(inputs.tinPitchFactor), '—'],
      ['Concrete mix', MIX_RATIOS[inputs.mixGrade].label, '—'],
      ['Flooring finish', inputs.rates.flooringFinish, '—'],
    ],
    margin,
  );

  y = ensurePage(doc, y, 28, margin);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Disclaimer: Approximate budgeting estimate for modern Assam Type (RCC columns/footing/plinth/lintel, 5" brick walls, tin roof on RCC king-post, steel, or timber truss — no RCC slab or floor beams). Not a structural design. Consult a licensed engineer for final design and quotations.',
    margin,
    y,
    { maxWidth: doc.internal.pageSize.getWidth() - margin * 2 },
  );

  doc.save(`builbid-assam-type-estimate-${Date.now()}.pdf`);
}
