import { jsPDF } from 'jspdf';

function pdfSafe(text: string): string {
  return text.replace(/₹/g, 'Rs.');
}

export interface ProjectDocumentPdfRow {
  label: string;
  value: string;
}

export interface ProjectDocumentPdfInput {
  title: string;
  subtitle: string;
  numericProjectId: string;
  projectName: string;
  rows: ProjectDocumentPdfRow[];
  notice?: string;
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

  y += 10;
  if (y > 275) {
    doc.addPage();
    y = 20;
  }
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
