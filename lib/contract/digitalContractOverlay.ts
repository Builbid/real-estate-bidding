import type { jsPDF } from 'jspdf';
import {
  PAGE_MARGIN_MM,
  drawParagraph,
  drawRows,
  drawSectionTitle,
  drawSignatureBlock,
  ensurePage,
  pdfSafeText,
} from '@/lib/contract/agreementPdf';

export type DigitalContractWatermark = 'DRAFT FOR ESIGN REVIEW' | 'AADHAAR ESIGN COMPLETE';

export interface AadhaarEsignStamp {
  partyTitle: string;
  signerName: string;
  aadhaarLast4: string;
  signedAtLabel: string;
  signatureRef: string;
}

export interface DigitalContractOverlay {
  plinthAreaLabel?: string | null;
  totalAgreedCostLabel?: string | null;
  startDateLabel?: string | null;
  completionDateLabel?: string | null;
  watermark?: DigitalContractWatermark | null;
  esignStamps?: AadhaarEsignStamp[] | null;
}

export function applyOverlayDates<T extends { agreedStartDate: string; agreedCompletionDate: string }>(
  payload: T,
  overlay?: DigitalContractOverlay | null,
): T {
  if (!overlay) return payload;
  return {
    ...payload,
    agreedStartDate: overlay.startDateLabel || payload.agreedStartDate,
    agreedCompletionDate: overlay.completionDateLabel || payload.agreedCompletionDate,
  };
}

export function drawFilledOrPrompt(
  doc: jsPDF,
  y: number,
  margin: number,
  filledLabel: string,
  filledValue: string | null | undefined,
  prompt: (nextY: number) => number,
): number {
  if (filledValue?.trim()) {
    return drawRows(doc, [{ label: filledLabel, value: filledValue.trim() }], y, margin);
  }
  return prompt(y);
}

export function drawAadhaarEsignBlocks(
  doc: jsPDF,
  startY: number,
  margin: number,
  stamps: AadhaarEsignStamp[],
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - margin * 2;
  const gap = 3;
  const cols = Math.min(3, Math.max(1, stamps.length));
  const boxW = (usable - gap * (cols - 1)) / cols;
  const boxH = 42;
  let y = ensurePage(doc, startY, boxH + 2, margin);

  stamps.forEach((stamp, i) => {
    const col = i % cols;
    if (col === 0 && i > 0) {
      y = ensurePage(doc, y + boxH + 3, boxH + 2, margin);
    }
    const x = margin + col * (boxW + gap);
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.45);
    doc.rect(x, y, boxW, boxH);
    doc.setFillColor(240, 253, 250);
    doc.rect(x, y, boxW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 118, 110);
    doc.text(pdfSafeText(stamp.partyTitle), x + 2, y + 5.4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(20);
    const nameLines = doc.splitTextToSize(pdfSafeText(stamp.signerName), boxW - 4) as string[];
    doc.text(nameLines.slice(0, 2), x + 2, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(15, 118, 110);
    doc.text('Digitally Signed via Aadhaar eSign', x + 2, y + 22);
    doc.setTextColor(60);
    doc.text(`Aadhaar: XXXX XXXX ${stamp.aadhaarLast4}`, x + 2, y + 27.5);
    doc.text(`Signed: ${pdfSafeText(stamp.signedAtLabel)}`, x + 2, y + 32.5);
    const refLines = doc.splitTextToSize(`Ref: ${stamp.signatureRef}`, boxW - 4) as string[];
    doc.text(refLines.slice(0, 2), x + 2, y + 37.5);
  });

  return y + boxH + 4;
}

export function drawExecutionSection(
  doc: jsPDF,
  y: number,
  margin: number,
  overlay: DigitalContractOverlay | null | undefined,
  onSiteCopy: string,
  handwrittenLabels: [string, string][],
): number {
  if (overlay?.esignStamps && overlay.esignStamps.length > 0) {
    y = drawSectionTitle(doc, '5. Dual Aadhaar eSign Authorization', y, margin);
    y = drawParagraph(
      doc,
      'This agreement is Digitally Signed via Aadhaar eSign after email OTP verification by both the Homeowner and the Contractor. BuilBid is witness to the digital execution.',
      y,
      margin,
    );
    return drawAadhaarEsignBlocks(doc, y, margin, overlay.esignStamps);
  }

  y = drawSectionTitle(doc, '5. Execution & Physical Authorization', y, margin);
  y = drawParagraph(doc, onSiteCopy, y, margin);
  return drawSignatureBlock(doc, y, margin, handwrittenLabels);
}

export function stampAgreementOverlay(doc: jsPDF, overlay?: DigitalContractOverlay | null): void {
  const mark = overlay?.watermark;
  if (!mark) return;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const signed = Boolean(overlay.esignStamps?.length);
    doc.setFillColor(signed ? 15 : 185, signed ? 118 : 28, signed ? 110 : 28);
    doc.rect(0, pageH - 8, pageW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255);
    doc.text(
      signed ? 'DIGITALLY SIGNED VIA AADHAAR eSIGN' : mark,
      pageW / 2,
      pageH - 3.1,
      { align: 'center' },
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(185, 28, 28);
    doc.text(mark, PAGE_MARGIN_MM, 24);
  }
}
