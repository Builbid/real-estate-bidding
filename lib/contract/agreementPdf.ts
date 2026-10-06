import { jsPDF } from 'jspdf';

/** Official mailbox that already receives selection notices (GMAIL_USER). */
export const BUILBID_CORP_GMAIL = 'builbidcorp@gmail.com';

/** Default official recipients for awarded-work agreement PDFs. */
export const BUILBID_OFFICIAL_AGREEMENT_EMAILS = [BUILBID_CORP_GMAIL] as const;

/** Blank line on the printed agreement so dates can be filled in by hand on site. */
/** Used only when a generated letter has no chosen date yet. Never an empty cell. */
export const AGREEMENT_MANUAL_DATE_BLANK = 'As recorded for Aadhaar OTP eSign';

/** Replaces underscores, dashes, and empty cells with a concrete agreement value. */
export function filledAgreementText(value: string | null | undefined, fallback: string): string {
  const text = (value ?? '').replace(/[—–]/g, '-').trim();
  if (!text || text === '-' || /^[_\s./-]+$/.test(text)) return fallback;
  return text;
}

/** Table / box border — slate-200. */
export const BORDER_RGB: [number, number, number] = [226, 232, 240];
export const PAGE_MARGIN_MM = 14;

export interface AgreementParty {
  name: string;
  email?: string | null;
  mobile?: string | null;
  address?: string | null;
  companyName?: string | null;
  gstNumber?: string | null;
  yearsInBusiness?: number | null;
  isVerified?: boolean | null;
  platformId?: string | null;
}

export interface AgreementRow {
  label: string;
  value: string;
}

/** One measured checklist line printed in section 3 of the official agreement. */
export interface MeasuredScheduleLine {
  group: string;
  item: string;
  measured: string;
  rate: string;
  amount: string;
}

export { formatBuilbidPublicId } from '@/lib/contract/builbidPublicId';

/** Platform currency uses ₹; Helvetica cannot draw it — PDF draw path maps to Rs. */
export function formatInrAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '₹—';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function pdfSafeText(text: string): string {
  return text
    .replace(/₹/g, 'Rs.')
    .replace(/[—–]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/×/g, 'x')
    .replace(/≈/g, '~')
    .replace(/\u00A0/g, ' ');
}

/** Strip accidental trailing punctuation like ". ." from formatted strings. */
export function cleanAgreementText(value: string): string {
  return value
    .replace(/\s+\.\s*\./g, '.')
    .replace(/\.\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function nonEmpty(value: string | null | undefined, fallback = '—'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function numericProjectId(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  if (/^[A-Z][0-9][A-Z][0-9][A-Z][0-9][A-Z][0-9]$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return /^[0-9]{6}$/.test(trimmed) ? trimmed : '';
}

export function officialAgreementFileName(
  projectId: string,
  numericId?: string | null,
): string {
  const numeric = numericProjectId(numericId);
  const safe =
    numeric ||
    projectId.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 36) ||
    'project';
  return `Official-Signed-Agreement-${safe}.pdf`;
}

export function officialAgreementEmailSubject(
  projectId: string,
  numericId: string | null | undefined,
  serviceLabel: string,
): string {
  const id = numericProjectId(numericId) || projectId;
  return `Official Signed Agreement - Project #${id} (${serviceLabel})`;
}

export function ensurePage(doc: jsPDF, y: number, need: number, margin: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

export function drawSectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  y = ensurePage(doc, y, 10, margin);
  const usable = doc.internal.pageSize.getWidth() - margin * 2;
  doc.setFillColor(15, 118, 110);
  doc.rect(margin, y, usable, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255);
  doc.text(title.toUpperCase(), margin + 2.5, y + 4.5);
  doc.setTextColor(20);
  return y + 9;
}

export function drawRows(doc: jsPDF, rows: AgreementRow[], startY: number, margin: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const labelW = usable * 0.38;
  const valueW = usable - labelW;
  const padX = 2.5;
  let y = startY;

  for (const row of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const labelLines = doc.splitTextToSize(pdfSafeText(row.label), labelW - padX * 2) as string[];
    doc.setFont('helvetica', 'normal');
    const valueLines = doc.splitTextToSize(pdfSafeText(row.value || '—'), valueW - padX * 2) as string[];
    const rowH = Math.max(7, Math.max(labelLines.length, valueLines.length) * 3.8 + 3.5);
    y = ensurePage(doc, y, rowH + 0.5, margin);
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, usable, rowH);
    doc.line(margin + labelW, y, margin + labelW, y + rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(40);
    doc.text(labelLines, margin + padX, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20);
    doc.text(valueLines, margin + labelW + padX, y + 4.2);
    y += rowH;
  }
  return y + 3.5;
}

export function drawParagraph(
  doc: jsPDF,
  text: string,
  startY: number,
  margin: number,
  opts?: { bold?: boolean; fill?: [number, number, number]; bordered?: boolean },
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const padX = 3.5;
  const padY = 3.2;
  doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(pdfSafeText(text), usable - padX * 2) as string[];
  const boxH = lines.length * 3.7 + padY * 2;
  const y = ensurePage(doc, startY, boxH + 1.5, margin);
  if (opts?.fill) {
    doc.setFillColor(...opts.fill);
    doc.rect(margin, y, usable, boxH, 'F');
  }
  if (opts?.bordered || opts?.fill) {
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.35);
    doc.rect(margin, y, usable, boxH, 'S');
  }
  doc.setTextColor(30);
  doc.text(lines, margin + padX, y + padY + 2.2);
  return y + boxH + 2.5;
}

export function drawSignatureBlock(
  doc: jsPDF,
  startY: number,
  margin: number,
  labels: [string, string][] = [
    ['PARTY A: HOMEOWNER', 'Aadhaar OTP eSign'],
    ['PARTY B: WORKER', 'Aadhaar OTP eSign'],
  ],
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const gap = 3;
  const boxW = (usable - gap * 2) / 3;
  const boxH = 32;
  const y = ensurePage(doc, startY, boxH + 2, margin);
  labels.forEach((pair, i) => {
    const x = margin + i * (boxW + gap);
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.35);
    doc.rect(x, y, boxW, boxH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(20);
    const title = doc.splitTextToSize(pair[0], boxW - 4) as string[];
    doc.text(title, x + 2, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80);
    const sub = doc.splitTextToSize(pair[1], boxW - 4) as string[];
    doc.text(sub, x + 2, y + 10);
    doc.setDrawColor(120);
    doc.line(x + 3, y + 22, x + boxW - 3, y + 22);
    doc.setFontSize(6.5);
    doc.text('Date: ____ / ____ / 20__', x + 2, y + 28);
  });
  return y + boxH + 4;
}

export function drawOfficialHeader(
  doc: jsPDF,
  margin: number,
  subtitle: string,
  title = 'DIGITAL CONSTRUCTION AGREEMENT',
): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255);
  doc.text('BUILBID', margin, 9);
  doc.setFontSize(9);
  doc.text(title, margin, 14.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(subtitle, margin, 19);
  return 26;
}

/** Handwritten fill-in line, e.g. Plinth Area ................ sqft */
export function drawFillInPrompt(
  doc: jsPDF,
  label: string,
  suffix: string,
  startY: number,
  margin: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const boxH = 12;
  const y = ensurePage(doc, startY, boxH + 2, margin);
  doc.setDrawColor(...BORDER_RGB);
  doc.setLineWidth(0.35);
  doc.rect(margin, y, usable, boxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.text(label, margin + 3.5, y + 7.5);
  const suffixW = doc.getTextWidth(suffix);
  doc.setDrawColor(80);
  doc.setLineWidth(0.4);
  const lineStart = margin + 3.5 + doc.getTextWidth(`${label}  `);
  const lineEnd = margin + usable - suffixW - 8;
  doc.line(lineStart, y + 8, Math.max(lineStart + 40, lineEnd), y + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(suffix, margin + usable - suffixW - 3.5, y + 7.5);
  return y + boxH + 3;
}

export function drawBlankColumnTable(
  doc: jsPDF,
  headers: string[],
  rowCount: number,
  startY: number,
  margin: number,
  colWeights?: number[],
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const weights = colWeights && colWeights.length === headers.length
    ? colWeights
    : headers.map(() => 1);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const colWidths = weights.map((w) => (usable * w) / weightSum);
  const headerH = 12;
  const rowH = 8;
  let y = ensurePage(doc, startY, headerH + rowH + 2, margin);

  const drawHeader = (atY: number) => {
    doc.setFillColor(15, 118, 110);
    doc.rect(margin, atY, usable, headerH, 'F');
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.3);
    doc.rect(margin, atY, usable, headerH);
    let x = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(255);
    headers.forEach((header, i) => {
      const w = colWidths[i] ?? 0;
      if (i > 0) doc.line(x, atY, x, atY + headerH);
      const lines = doc.splitTextToSize(pdfSafeText(header), w - 2.4) as string[];
      doc.text(lines, x + 1.2, atY + 4);
      x += w;
    });
    doc.setTextColor(20);
    return atY + headerH;
  };

  y = drawHeader(y);

  for (let i = 0; i < rowCount; i += 1) {
    if (y + rowH > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
      y = drawHeader(y);
    }
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, usable, rowH);
    let x = margin;
    colWidths.forEach((w) => {
      if (x > margin) doc.line(x, y, x, y + rowH);
      x += w;
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80);
    doc.text(String(i + 1), margin + 2, y + 5.4);
    y += rowH;
  }

  return y + 3.5;
}

/** Site-visit facts that validate section 2. No-op when the checklist has not been saved. */
export function appendChecklistRecord(
  doc: jsPDF,
  y: number,
  margin: number,
  rows: AgreementRow[] | null | undefined,
): number {
  if (!rows?.length) return y;
  y = drawParagraph(
    doc,
    'Site visit checklist: these measurements and site conditions were recorded with the homeowner and the worker. They form part of this agreement.',
    y,
    margin,
  );
  return drawRows(doc, rows, y, margin);
}

/** Measured quantity schedule that fixes section 3. No-op when the checklist has no lines. */
export function appendMeasuredSchedule(
  doc: jsPDF,
  startY: number,
  margin: number,
  lines: MeasuredScheduleLine[] | null | undefined,
): number {
  if (!lines?.length) return startY;
  let y = drawParagraph(
    doc,
    'Measured quantities from the site visit checklist, priced at the accepted bid rates. This schedule fixes the agreed project cost.',
    startY,
    margin,
  );
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const cols = [0.46, 0.16, 0.2, 0.18].map((weight) => usable * weight);
  const headers = ['Item', 'Measured', 'Rate', 'Amount'];
  const headerH = 7;

  const drawHeader = (atY: number) => {
    doc.setFillColor(15, 118, 110);
    doc.rect(margin, atY, usable, headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255);
    let x = margin;
    headers.forEach((header, i) => {
      doc.text(header, x + 1.5, atY + 4.6);
      x += cols[i] ?? 0;
    });
    doc.setTextColor(20);
    return atY + headerH;
  };

  y = ensurePage(doc, y, headerH + 10, margin);
  y = drawHeader(y);
  let lastGroup = '';

  for (const line of lines) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const itemLines = doc.splitTextToSize(pdfSafeText(line.item), (cols[0] ?? 40) - 3) as string[];
    const rowH = Math.max(7, itemLines.length * 3.4 + 2.4);
    const groupH = line.group !== lastGroup ? 6 : 0;
    if (y + groupH + rowH > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = drawHeader(margin);
      lastGroup = '';
    }
    if (line.group !== lastGroup) {
      lastGroup = line.group;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(...BORDER_RGB);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, usable, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text(pdfSafeText(line.group).toUpperCase(), margin + 1.5, y + 4.1);
      y += 6;
    }
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, usable, rowH);
    let x = margin;
    const cells = [itemLines, [pdfSafeText(line.measured)], [pdfSafeText(line.rate)], [pdfSafeText(line.amount)]];
    cells.forEach((cellLines, i) => {
      const w = cols[i] ?? 0;
      if (i > 0) doc.line(x, y, x, y + rowH);
      doc.setFont('helvetica', i === 0 ? 'normal' : 'normal');
      doc.setFontSize(7);
      doc.setTextColor(20);
      doc.text(cellLines, x + 1.5, y + 4.4);
      x += w;
    });
    y += rowH;
  }

  return y + 3;
}
