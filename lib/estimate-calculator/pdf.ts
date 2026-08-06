import { jsPDF } from 'jspdf';
import { MIX_RATIOS, type EstimateInputs, type EstimateResults } from './types';

type Row = [string, string, string];

function renderEstimateTable(
  doc: jsPDF,
  startY: number,
  title: string,
  headers: [string, string, string],
  rows: Row[],
  margin: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const colW = [usable * 0.46, usable * 0.32, usable * 0.22];
  const rowH = 8;
  let y = startY;

  const ensureSpace = (need: number) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + need > pageH - 18) {
      doc.addPage();
      y = 20;
    }
  };

  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(title, margin, y);
  y += 6;

  const drawRow = (cells: [string, string, string], header: boolean) => {
    ensureSpace(rowH + 2);
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
    // vertical guides
    doc.setDrawColor(200);
    doc.line(x0 + colW[0], y, x0 + colW[0], y + rowH);
    doc.line(x0 + colW[0] + colW[1], y, x0 + colW[0] + colW[1], y + rowH);
    y += rowH;
  };

  drawRow(headers, true);
  doc.setDrawColor(180);
  for (const row of rows) {
    drawRow(row, false);
  }
  y += 6;
  return y;
}

/** Client-side PDF — results in proper table format. */
export function downloadEstimatePdf(inputs: EstimateInputs, results: EstimateResults): void {
  const doc = new jsPDF();
  const margin = 14;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text('BuilBid — Material Estimate Report', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text('Approximate budgeting estimate (not a structural design)', margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y);
  y += 5;
  doc.text(
    `Wastage buffer: ${results.wastagePercent}% · Stirrups (Ring) spacing (auto): ${results.meta.standardSpacingMm} mm · Lap/development: ${results.meta.lapMultiplier}×d`,
    margin,
    y,
  );
  y += 8;

  y = renderEstimateTable(
    doc,
    y,
    '1. Material Summary',
    ['Item', 'Quantity', 'Unit'],
    [
      ['Cement (total)', String(results.cementBags), 'bags'],
      [
        '  — RCC concrete',
        String(results.meta.cementBagsRcc),
        'bags',
      ],
      [
        '  — Brick masonry mortar (1:6)',
        String(results.meta.cementBagsBrickMortar),
        'bags',
      ],
      [
        '  — Plaster walls + ceiling (1:4, 12 mm)',
        String(results.meta.cementBagsPlaster),
        'bags',
      ],
      ['Sand (total)', String(results.sandCum), 'cum'],
      ['Coarse aggregate', String(results.aggregateCum), 'cum'],
      ['Bricks (total)', results.bricks.toLocaleString('en-IN'), 'nos'],
      [
        '  — Walls',
        results.meta.bricksWalls.toLocaleString('en-IN'),
        'nos',
      ],
      [
        '  — Foundation soling',
        results.meta.bricksFoundationSoling.toLocaleString('en-IN'),
        'nos',
      ],
      [
        '  — Flooring bed',
        results.meta.bricksFlooring.toLocaleString('en-IN'),
        'nos',
      ],
      ['Total steel', String(results.totalSteelQuintals), 'quintals'],
    ],
    margin,
  );

  const steelRows: Row[] = results.steelByDiameter.map((r) => [
    `${r.diameterMm} mm bars`,
    String(r.quintals),
    'quintals',
  ]);
  if (steelRows.length === 0) {
    steelRows.push(['—', '0', 'quintals']);
  }
  y = renderEstimateTable(
    doc,
    y,
    '2. Steel by Diameter (incl. laps / development)',
    ['Diameter', 'Quantity', 'Unit'],
    steelRows,
    margin,
  );

  y = renderEstimateTable(
    doc,
    y,
    '3. Concrete Volume Breakdown',
    ['Member', 'Volume', 'Unit'],
    [
      ['Columns', String(results.concreteVolumeCum.columns), 'cum'],
      ['Beams', String(results.concreteVolumeCum.beams), 'cum'],
      ['Footings', String(results.concreteVolumeCum.footings), 'cum'],
      ['Slab', String(results.concreteVolumeCum.slab), 'cum'],
      ['Staircase', String(results.concreteVolumeCum.staircase), 'cum'],
      ['Total concrete', String(results.concreteVolumeCum.total), 'cum'],
    ],
    margin,
  );

  y = renderEstimateTable(
    doc,
    y,
    '4. Key Project Inputs',
    ['Parameter', 'Value', 'Unit'],
    [
      ['Unit type', inputs.unitType, '—'],
      ['Floors', String(inputs.floors), 'nos'],
      ['Built-up / floor', String(inputs.builtUpAreaPerFloorSqft), 'sqft'],
      ['Slab area / floor', String(inputs.slabAreaPerFloorSqft), 'sqft'],
      ['Total slab area', String(results.meta.slabAreaSqft), 'sqft'],
      ['Foundation depth', String(inputs.foundationDepthFt), 'ft'],
      ['Plinth height', String(inputs.plinthHeightFt), 'ft'],
      ['Floor-to-floor height', String(inputs.floorToFloorHeightFt), 'ft'],
      ['Total column height', String(results.meta.totalColumnHeightFt), 'ft'],
      ['Columns', String(inputs.columnCount), 'nos'],
      [
        'Column bars',
        `${inputs.columnRodsCount1}×${inputs.columnRodDia1Mm}mm + ${inputs.columnRodsCount2}×${inputs.columnRodDia2Mm}mm`,
        '—',
      ],
      ['Beams', String(inputs.beamCount), 'nos'],
      [
        'Beam bars',
        `${inputs.beamRodsCount1}×${inputs.beamRodDia1Mm}mm + ${inputs.beamRodsCount2}×${inputs.beamRodDia2Mm}mm`,
        '—',
      ],
      ['Concrete mix', MIX_RATIOS[inputs.mixGrade].label, '—'],
      ['Staircase area', String(results.meta.staircaseAreaSqft), 'sqft'],
      [
        'Wall area (ext + int)',
        `${results.meta.exteriorWallAreaSqft} + ${results.meta.interiorWallAreaSqft}`,
        'sqft',
      ],
    ],
    margin,
  );

  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 28) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Disclaimer: Approximate material estimate for budgeting based on standard Indian civil engineering thumb rules (incl. 50d lap/development, 125 mm stirrup spacing, BHK interior walls, staircase, foundation & flooring brick soling). Consult a structural engineer for final design and quantities.',
    margin,
    y,
    { maxWidth: doc.internal.pageSize.getWidth() - margin * 2 },
  );

  doc.save(`builbid-material-estimate-${Date.now()}.pdf`);
}
