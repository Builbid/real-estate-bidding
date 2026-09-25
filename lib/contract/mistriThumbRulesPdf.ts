import { jsPDF } from 'jspdf';
import {
  PAGE_MARGIN_MM,
  drawParagraph,
  drawRows,
  drawSectionTitle,
  officialAgreementFileName,
  pdfSafeText,
} from '@/lib/contract/agreementPdf';
import { drawStructuralSectionDiagrams } from '@/lib/contract/sectionDiagrams';
import {
  buildMistriThumbRulesGuide,
  type MistriThumbRulesGuide,
  type MistriThumbRulesProjectInput,
} from '@/lib/thumb-rules/mistriThumbRules';

export function mistriThumbRulesFileName(projectId: string, numericId?: string | null): string {
  return officialAgreementFileName(projectId, numericId).replace(
    'Official-Signed-Agreement-',
    'Site-Thumb-Rules-',
  );
}

function drawCover(doc: jsPDF, guide: MistriThumbRulesGuide, margin: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 78, 'F');
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 78, pageW, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(153, 246, 228);
  doc.text('BUILBID', margin, 16);
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('FOR THE OWNER AND THE HEAD MASON', margin, 22);

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Site guide for your house', margin, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const titleLines = doc.splitTextToSize(pdfSafeText(guide.projectTitle), pageW - margin * 2) as string[];
  doc.setFont('helvetica', 'bold');
  doc.text(titleLines, margin, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(pdfSafeText(guide.siteAddress), margin, 48 + titleLines.length * 5 + 4);

  const facts = [
    guide.snapshotRows.find((row) => row.label === 'Typical / plinth area')?.value ?? '-',
    guide.snapshotRows.find((row) => row.label === 'Current floors')?.value ?? '-',
    'Seismic Zone V',
  ];
  const boxY = 92;
  const boxW = (pageW - margin * 2 - 8) / 3;
  facts.forEach((fact, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, boxY, boxW, 18, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(pdfSafeText(fact), boxW - 6) as string[];
    doc.text(lines, x + 3, boxY + 7);
  });

  let y = 122;
  y = drawSectionTitle(doc, 'In simple words', y, margin);
  y = drawRows(doc, guide.clientSummaryRows, y, margin);

  y = drawSectionTitle(doc, 'How to read this booklet', y, margin);
  y = drawRows(doc, guide.howToRows, y, margin);

  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(251, 191, 36);
  const note = pdfSafeText(guide.disclaimer);
  const noteLines = doc.splitTextToSize(note, pageW - margin * 2 - 8) as string[];
  const noteH = noteLines.length * 3.6 + 10;
  if (y + noteH < pageH - 24) {
    doc.roundedRect(margin, y, pageW - margin * 2, noteH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text('Please read', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(69, 26, 3);
    doc.text(noteLines, margin + 4, y + 10);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(guide.generatedAtLabel, margin, pageH - 14);
  if (guide.numericProjectId) {
    doc.text(`Project #${guide.numericProjectId}`, pageW - margin, pageH - 14, { align: 'right' });
  }
}

function decoratePages(doc: jsPDF, guide: MistriThumbRulesGuide, margin: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  const id = guide.numericProjectId ? `#${guide.numericProjectId}` : '';

  for (let i = 2; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 10, 'F');
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 10, pageW, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255);
    doc.text('BUILBID  ·  SITE GUIDE', margin, 6.6);
    doc.setFont('helvetica', 'normal');
    const shortTitle = pdfSafeText(guide.projectTitle).slice(0, 42);
    doc.text(`${shortTitle}  ${id}`, pageW - margin, 6.6, { align: 'right' });

    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageH - 9, pageW, 9, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text('Guidance only  ·  Not a signed structural drawing', margin, pageH - 3.6);
    doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 3.6, { align: 'right' });
  }
}

export function generateMistriThumbRulesPdfBytes(project: MistriThumbRulesProjectInput): Uint8Array {
  return generateMistriThumbRulesPdfFromGuide(buildMistriThumbRulesGuide(project));
}

export function generateMistriThumbRulesPdfFromGuide(guide: MistriThumbRulesGuide): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = PAGE_MARGIN_MM;

  drawCover(doc, guide, margin);
  doc.addPage();

  let y = 16;
  y = drawSectionTitle(doc, '1. This project', y, margin);
  y = drawRows(doc, guide.snapshotRows, y, margin);

  y = drawSectionTitle(doc, '2. One-page bar schedule', y, margin);
  y = drawParagraph(
    doc,
    'Keep this table on site. If a size on the shuttering is smaller than this line, do not cast.',
    y,
    margin,
    { fill: [240, 253, 250], bordered: true },
  );
  y = drawRows(doc, guide.scheduleRows, y, margin);

  y = drawSectionTitle(doc, '3. Approximate materials (to check the quotation)', y, margin);
  y = drawRows(doc, guide.quantityRows, y, margin);

  y = drawSectionTitle(doc, '4. Assumed analysis', y, margin);
  y = drawRows(doc, guide.analysisRows, y, margin);

  y = drawSectionTitle(doc, '5. Seismic Zone V (Assam)', y, margin);
  y = drawRows(doc, guide.seismicRows, y, margin);

  y = drawSectionTitle(doc, '6. Foundation and plinth', y, margin);
  y = drawRows(doc, guide.foundationRows, y, margin);

  y = drawSectionTitle(doc, '7. Columns', y, margin);
  y = drawRows(doc, guide.columnRows, y, margin);

  y = drawSectionTitle(doc, '8. Beams and lintels', y, margin);
  y = drawRows(doc, guide.beamRows, y, margin);

  y = drawSectionTitle(doc, '9. Cross-sections - column, beam, footing', y, margin);
  y = drawParagraph(
    doc,
    'Typical mid-span sketches using this project\'s sizes. Not to scale and not a working drawing.',
    y,
    margin,
    { bordered: true },
  );
  y = drawStructuralSectionDiagrams(doc, guide.diagrams, y, margin);

  y = drawSectionTitle(doc, '10. Slabs', y, margin);
  y = drawRows(doc, guide.slabRows, y, margin);

  y = drawSectionTitle(doc, '11. Steel fixing', y, margin);
  y = drawRows(doc, guide.steelRows, y, margin);

  y = drawSectionTitle(doc, '12. Clear cover and concrete', y, margin);
  y = drawRows(doc, guide.coverRows, y, margin);

  if (guide.masonryRows.length > 0) {
    y = drawSectionTitle(doc, '13. Walls, plaster and flooring', y, margin);
    y = drawRows(doc, guide.masonryRows, y, margin);
  }

  if (guide.assamRows.length > 0) {
    y = drawSectionTitle(doc, 'Assam Type roof', y, margin);
    y = drawRows(doc, guide.assamRows, y, margin);
  }

  y = drawSectionTitle(doc, '14. Work sequence', y, margin);
  y = drawRows(doc, guide.stageRows, y, margin);

  y = drawSectionTitle(doc, '15. Owner checks before saying "cast"', y, margin);
  y = drawRows(doc, guide.ownerCheckRows, y, margin);

  y = drawSectionTitle(doc, '16. Stop and call an engineer', y, margin);
  y = drawRows(doc, guide.redFlagRows, y, margin);

  y = drawSectionTitle(doc, '17. Simple glossary', y, margin);
  y = drawRows(doc, guide.glossaryRows, y, margin);

  y = drawSectionTitle(doc, 'Site checklist', y, margin);
  y = drawRows(doc, guide.checklistRows, y, margin);

  drawParagraph(
    doc,
    'BuilBid prepared this booklet from the uploaded Mistri project so the owner and Head Mason share one set of site numbers. Casting without an engineer drawing is at the parties own risk.',
    y,
    margin,
    { bordered: true },
  );

  decoratePages(doc, guide, margin);
  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}
