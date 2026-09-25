import { jsPDF } from 'jspdf';
import {
  PAGE_MARGIN_MM,
  drawOfficialHeader,
  drawParagraph,
  drawRows,
  drawSectionTitle,
  officialAgreementFileName,
} from '@/lib/contract/agreementPdf';
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

export function generateMistriThumbRulesPdfBytes(project: MistriThumbRulesProjectInput): Uint8Array {
  return generateMistriThumbRulesPdfFromGuide(buildMistriThumbRulesGuide(project));
}

export function generateMistriThumbRulesPdfFromGuide(guide: MistriThumbRulesGuide): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = PAGE_MARGIN_MM;
  const subtitle = guide.numericProjectId
    ? `Project #${guide.numericProjectId}  ·  ${guide.generatedAtLabel}`
    : guide.generatedAtLabel;

  let y = drawOfficialHeader(doc, margin, subtitle, 'SITE THUMB-RULE GUIDE');

  y = drawParagraph(
    doc,
    'Site sizes for the Head Mason and owner from this uploaded Mistri project. Approximate analysis for a regular house in Seismic Zone V. Not a signed structural drawing.',
    y,
    margin,
    { bold: true, fill: [254, 243, 199], bordered: true },
  );

  y = drawSectionTitle(doc, '1. This project', y, margin);
  y = drawRows(doc, guide.snapshotRows, y, margin);

  y = drawSectionTitle(doc, '2. Read this first', y, margin);
  y = drawParagraph(doc, guide.disclaimer, y, margin, { fill: [255, 247, 237], bordered: true });

  y = drawSectionTitle(doc, '3. Assumed analysis', y, margin);
  y = drawRows(doc, guide.analysisRows, y, margin);

  y = drawSectionTitle(doc, '4. Seismic Zone V (Assam)', y, margin);
  y = drawRows(doc, guide.seismicRows, y, margin);

  y = drawSectionTitle(doc, '5. Foundation and plinth', y, margin);
  y = drawRows(doc, guide.foundationRows, y, margin);

  y = drawSectionTitle(doc, '6. Columns', y, margin);
  y = drawRows(doc, guide.columnRows, y, margin);

  y = drawSectionTitle(doc, '7. Beams and lintels', y, margin);
  y = drawRows(doc, guide.beamRows, y, margin);

  y = drawSectionTitle(doc, '8. Slabs', y, margin);
  y = drawRows(doc, guide.slabRows, y, margin);

  y = drawSectionTitle(doc, '9. Steel fixing', y, margin);
  y = drawRows(doc, guide.steelRows, y, margin);

  y = drawSectionTitle(doc, '10. Clear cover and concrete', y, margin);
  y = drawRows(doc, guide.coverRows, y, margin);

  if (guide.masonryRows.length > 0) {
    y = drawSectionTitle(doc, '11. Walls, plaster and flooring', y, margin);
    y = drawRows(doc, guide.masonryRows, y, margin);
  }

  if (guide.assamRows.length > 0) {
    y = drawSectionTitle(
      doc,
      guide.masonryRows.length > 0 ? '12. Assam Type roof' : '11. Assam Type roof',
      y,
      margin,
    );
    y = drawRows(doc, guide.assamRows, y, margin);
  }

  y = drawSectionTitle(doc, 'Site checklist', y, margin);
  y = drawRows(doc, guide.checklistRows, y, margin);

  y = drawParagraph(
    doc,
    'BuilBid issues this sheet so the Mistri and client use the same site numbers. Casting without an engineer drawing is at the parties own risk.',
    y,
    margin,
    { bordered: true },
  );

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}
