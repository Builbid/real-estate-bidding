import type { jsPDF } from 'jspdf';
import { ensurePage } from '@/lib/contract/agreementPdf';
import type { SectionDiagrams } from '@/lib/thumb-rules/mistriThumbRules';

const INK: [number, number, number] = [15, 23, 42];
const TEAL: [number, number, number] = [15, 118, 110];
const CONCRETE: [number, number, number] = [241, 245, 249];
const PCC: [number, number, number] = [203, 213, 225];
const DIM: [number, number, number] = [71, 85, 105];
const STEEL: [number, number, number] = [15, 23, 42];

function drawBar(doc: jsPDF, x: number, y: number, r: number) {
  doc.setFillColor(...STEEL);
  doc.circle(x, y, r, 'F');
}

function drawCaption(doc: jsPDF, x: number, y: number, title: string, detail: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(title, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...DIM);
  doc.text(detail, x, y + 3.6);
}

function evenly(count: number, start: number, end: number): number[] {
  if (count <= 1) return [(start + end) / 2];
  return Array.from({ length: count }, (_, i) => start + ((end - start) * i) / (count - 1));
}

function columnBarPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  inset: number,
  count: number,
): Array<{ x: number; y: number }> {
  const left = x + inset;
  const right = x + w - inset;
  const top = y + inset;
  const bottom = y + h - inset;
  const corners = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ];
  if (count <= 4) return corners;
  const midTop = { x: (left + right) / 2, y: top };
  const midBottom = { x: (left + right) / 2, y: bottom };
  const midLeft = { x: left, y: (top + bottom) / 2 };
  const midRight = { x: right, y: (top + bottom) / 2 };
  if (count === 6) {
    return h >= w
      ? [...corners, midLeft, midRight]
      : [...corners, midTop, midBottom];
  }
  return [...corners, midTop, midBottom, midLeft, midRight];
}

function drawColumnSection(
  doc: jsPDF,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  section: SectionDiagrams['column'],
) {
  const scale = Math.min((boxW - 22) / section.widthMm, (boxH - 20) / section.depthMm);
  const w = section.widthMm * scale;
  const h = section.depthMm * scale;
  const x = boxX + (boxW - w) / 2;
  const y = boxY + 4;
  const cover = section.coverMm * scale;
  const barR = Math.max(1.1, (section.barDiaMm * scale) / 2);

  doc.setFillColor(...CONCRETE);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, 'FD');

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.55);
  doc.rect(x + cover, y + cover, w - cover * 2, h - cover * 2);

  for (const point of columnBarPoints(x, y, w, h, cover + 1.2, section.barCount)) {
    drawBar(doc, point.x, point.y, barR);
  }

  doc.setDrawColor(...DIM);
  doc.setLineWidth(0.25);
  doc.line(x - 7, y, x - 7, y + h);
  doc.line(x - 8.5, y, x - 5.5, y);
  doc.line(x - 8.5, y + h, x - 5.5, y + h);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...DIM);
  doc.text(`${section.depthMm}`, x - 12, y + h / 2 - 2);
  doc.text('mm', x - 12, y + h / 2 + 1.6);

  doc.line(x, y + h + 5, x + w, y + h + 5);
  doc.line(x, y + h + 3.5, x, y + h + 6.5);
  doc.line(x + w, y + h + 3.5, x + w, y + h + 6.5);
  doc.text(`${section.widthMm} mm`, x + w / 2, y + h + 9, { align: 'center' });

  doc.setFontSize(6);
  doc.text(`cover ${section.coverMm} mm`, x + w + 1.5, y + 6);
  doc.text(`${section.tieDiaMm} mm tie`, x + w + 1.5, y + 10);
}

function drawBeamSection(
  doc: jsPDF,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  section: SectionDiagrams['beam'],
) {
  const scale = Math.min((boxW - 24) / section.widthMm, (boxH - 20) / section.depthMm);
  const w = section.widthMm * scale;
  const h = section.depthMm * scale;
  const x = boxX + (boxW - w) / 2;
  const y = boxY + 4;
  const cover = section.coverMm * scale;
  const topR = Math.max(1.05, (section.topDiaMm * scale) / 2);
  const botR = Math.max(1.15, (section.bottomDiaMm * scale) / 2);

  doc.setFillColor(...CONCRETE);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.45);
  doc.rect(x, y, w, h, 'FD');

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.55);
  doc.rect(x + cover, y + cover, w - cover * 2, h - cover * 2);

  const innerL = x + cover + 2;
  const innerR = x + w - cover - 2;
  for (const px of evenly(section.topBars, innerL, innerR)) {
    drawBar(doc, px, y + cover + 2.2, topR);
  }
  for (const px of evenly(section.bottomBars, innerL, innerR)) {
    drawBar(doc, px, y + h - cover - 2.2, botR);
  }

  doc.setDrawColor(...DIM);
  doc.setLineWidth(0.25);
  doc.line(x - 7, y, x - 7, y + h);
  doc.line(x - 8.5, y, x - 5.5, y);
  doc.line(x - 8.5, y + h, x - 5.5, y + h);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...DIM);
  doc.text(`${section.depthMm}`, x - 12, y + h / 2 - 2);
  doc.text('mm', x - 12, y + h / 2 + 1.6);

  doc.line(x, y + h + 5, x + w, y + h + 5);
  doc.line(x, y + h + 3.5, x, y + h + 6.5);
  doc.line(x + w, y + h + 3.5, x + w, y + h + 6.5);
  doc.text(`${section.widthMm} mm`, x + w / 2, y + h + 9, { align: 'center' });

  doc.setFontSize(6);
  doc.text(`top ${section.topBars}-${section.topDiaMm}`, x + w + 1.5, y + 6);
  doc.text(`bot ${section.bottomBars}-${section.bottomDiaMm}`, x + w + 1.5, y + h - 4);
  doc.text(`${section.stirrupDiaMm} mm stirrup`, x + w + 1.5, y + h / 2);
}

function drawFootingSection(
  doc: jsPDF,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  section: SectionDiagrams['footing'],
) {
  const footingWmm = section.sideFt * 304.8;
  const thickMm = section.thickIn * 25.4;
  const pccMm = section.pccIn * 25.4;
  const scale = Math.min((boxW - 20) / footingWmm, (boxH - 22) / (thickMm + pccMm + section.columnDepthMm * 0.7));
  const fw = footingWmm * scale;
  const th = thickMm * scale;
  const pccH = Math.max(3.2, pccMm * scale);
  const colW = section.columnWidthMm * scale;
  const colH = Math.max(14, section.columnDepthMm * scale * 0.35);
  const x = boxX + (boxW - fw) / 2;
  const pccY = boxY + boxH - 14;
  const footY = pccY - th;
  const colX = x + (fw - colW) / 2;
  const colY = footY - colH;

  doc.setFillColor(...PCC);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.rect(x, pccY, fw, pccH, 'FD');

  doc.setFillColor(...CONCRETE);
  doc.rect(x, footY, fw, th, 'FD');
  doc.rect(colX, colY, colW, colH + 0.4, 'FD');

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.45);
  const meshY = footY + th - Math.max(2.4, section.coverMm * scale * 0.15);
  doc.line(x + 3, meshY, x + fw - 3, meshY);
  for (let i = 1; i < 8; i += 1) {
    const mx = x + (fw * i) / 8;
    doc.line(mx, meshY - 1.6, mx, meshY + 1.6);
  }

  doc.setDrawColor(...DIM);
  doc.setLineWidth(0.25);
  doc.line(x, pccY + pccH + 4.2, x + fw, pccY + pccH + 4.2);
  doc.line(x, pccY + pccH + 2.8, x, pccY + pccH + 5.6);
  doc.line(x + fw, pccY + pccH + 2.8, x + fw, pccY + pccH + 5.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...DIM);
  doc.text(`${section.sideFt.toFixed(1)} ft`, x + fw / 2, pccY + pccH + 8, { align: 'center' });

  doc.line(x + fw + 5, footY, x + fw + 5, footY + th);
  doc.line(x + fw + 3.5, footY, x + fw + 6.5, footY);
  doc.line(x + fw + 3.5, footY + th, x + fw + 6.5, footY + th);
  doc.text(`${section.thickIn}"`, x + fw + 7, footY + th / 2 + 1);

  doc.setFontSize(6);
  doc.text('column', colX + colW / 2, colY - 1.6, { align: 'center' });
  doc.text(`PCC ${section.pccIn}"`, x + 2, pccY + pccH - 1);
  doc.text(`${section.meshDiaMm} mm mesh`, x + 3, meshY - 2.2);
}

export function drawStructuralSectionDiagrams(
  doc: jsPDF,
  diagrams: SectionDiagrams,
  startY: number,
  margin: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  let y = ensurePage(doc, startY, 88, margin);

  const colW = (usable - 4) / 2;
  const topH = 68;
  drawCaption(doc, margin, y, 'A. Column cross-section', diagrams.column.label);
  drawCaption(doc, margin + colW + 4, y, 'B. Beam cross-section', diagrams.beam.label);
  y += 6;
  drawColumnSection(doc, margin, y, colW, topH, diagrams.column);
  drawBeamSection(doc, margin + colW + 4, y, colW, topH, diagrams.beam);
  y += topH + 8;

  y = ensurePage(doc, y, 78, margin);
  drawCaption(doc, margin, y, 'C. Footing cross-section', diagrams.footing.label);
  y += 6;
  drawFootingSection(doc, margin, y, usable, 64, diagrams.footing);
  y += 68;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...DIM);
  const note =
    'Typical mid-span sketches for this project. Not to scale. Black dots = main bars. Teal line = tie / stirrup / mesh. Confirm cover and bar count on site before casting.';
  const lines = doc.splitTextToSize(note, usable) as string[];
  doc.text(lines, margin, y);
  return y + lines.length * 3.4 + 3;
}
