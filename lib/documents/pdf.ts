import { jsPDF } from 'jspdf';

function pdfSafe(text: string): string {
  return text.replace(/₹/g, 'Rs.');
}

function wrappedLines(doc: jsPDF, text: string, width: number): string[] {
  return doc.splitTextToSize(pdfSafe(text), width) as string[];
}

function newPageIfNeeded(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 16) {
    doc.addPage();
    return 20;
  }
  return y;
}

export interface ProjectDocumentPdfRow {
  label: string;
  value: string;
}

export interface ProjectDocumentPdfBulletSection {
  heading: string;
  intro?: string;
  lines: string[];
  note?: string;
}

export interface ProjectDocumentPdfCallout {
  title: string;
  lines: string[];
}

export interface ProjectDocumentPdfInput {
  title: string;
  subtitle: string;
  numericProjectId: string;
  projectName: string;
  rows: ProjectDocumentPdfRow[];
  notice?: string;
  /** Full-width item list rendered after the metadata rows. */
  bulletSection?: ProjectDocumentPdfBulletSection;
  /** Boxed notes rendered after the bullet list. */
  callout?: ProjectDocumentPdfCallout;
}

export function generateProjectDocumentPdfBytes(input: ProjectDocumentPdfInput): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 0;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255);
  doc.text('BUILBID', margin, 10);
  doc.setFontSize(10);
  doc.text(pdfSafe(input.title), margin, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(pdfSafe(input.subtitle), margin, 21);

  y = 32;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Project ID: ${input.numericProjectId}`, margin, y);
  y += 7;
  doc.setFontSize(12);
  const titleLines = doc.splitTextToSize(pdfSafe(input.projectName), pageW - margin * 2) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 4;

  if (input.notice) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51);
    const noticeLines = doc.splitTextToSize(pdfSafe(input.notice), pageW - margin * 2) as string[];
    doc.text(noticeLines, margin, y);
    y += noticeLines.length * 4.2 + 6;
  }

  const usable = pageW - margin * 2;
  const labelW = usable * 0.38;
  doc.setDrawColor(226, 232, 240);

  for (const row of input.rows) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const valueLines = doc.splitTextToSize(pdfSafe(row.value || '—'), usable - labelW - 4) as string[];
    const rowH = Math.max(9, valueLines.length * 4.5 + 4);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, usable, rowH, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(pdfSafe(row.label), margin + 2, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(valueLines, margin + labelW + 2, y + 5.5);
    y += rowH;
  }

  if (input.bulletSection) {
    y = drawBulletSection(doc, y, margin, pageW, input.bulletSection);
  }
  if (input.callout) {
    y = drawCallout(doc, y, margin, pageW, input.callout);
  }

  y += 10;
  y = newPageIfNeeded(doc, y, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text(
    'This file is retained on the BuilBid server as an immutable backup. Removing it from your Documents list hides it from your account only.',
    margin,
    y,
    { maxWidth: usable },
  );

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

function drawBulletSection(
  doc: jsPDF,
  startY: number,
  margin: number,
  pageW: number,
  section: ProjectDocumentPdfBulletSection,
): number {
  let y = startY + 6;
  const usable = pageW - margin * 2;

  y = newPageIfNeeded(doc, y, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfSafe(section.heading), margin, y);
  y += 6;

  if (section.intro) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const introLines = wrappedLines(doc, section.intro, usable);
    y = newPageIfNeeded(doc, y, introLines.length * 4.2);
    doc.text(introLines, margin, y);
    y += introLines.length * 4.2 + 4;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  for (const line of section.lines) {
    const textLines = wrappedLines(doc, line, usable - 8);
    const blockH = textLines.length * 5 + 2.6;
    y = newPageIfNeeded(doc, y, blockH);
    doc.setFillColor(15, 23, 42);
    doc.circle(margin + 1.6, y - 1.15, 0.65, 'F');
    doc.text(textLines, margin + 5.5, y);
    y += blockH;
  }

  if (section.note) {
    y += 1.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const noteLines = wrappedLines(doc, section.note, usable);
    y = newPageIfNeeded(doc, y, noteLines.length * 4.2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4.2;
  }

  return y;
}

function drawCallout(
  doc: jsPDF,
  startY: number,
  margin: number,
  pageW: number,
  callout: ProjectDocumentPdfCallout,
): number {
  const usable = pageW - margin * 2;
  const padX = 4;
  const innerW = usable - padX * 2;
  const lineH = 4.2;
  const paragraphGap = 1.8;
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const paragraphs = callout.lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => wrappedLines(doc, line, innerW));

  const bodyH =
    paragraphs.reduce((sum, lines) => sum + lines.length * lineH, 0) +
    Math.max(0, paragraphs.length - 1) * paragraphGap;
  const topPad = 5;
  const titleBlock = 6;
  const bottomPad = 4;
  const boxH = topPad + titleBlock + bodyH + bottomPad;
  let y = startY + 8;
  if (y + boxH > pageH - 16) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, usable, boxH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfSafe(callout.title), margin + padX, y + topPad + 3.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  let textY = y + topPad + titleBlock + 3;
  paragraphs.forEach((lines, index) => {
    doc.text(lines, margin + padX, textY);
    textY += lines.length * lineH;
    if (index < paragraphs.length - 1) textY += paragraphGap;
  });

  return y + boxH;
}
