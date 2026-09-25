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
    'Indicative sizes for the Head Mason and owner — generated from this uploaded Mistri project. Not a structural drawing.',
    y,
    margin,
    { bold: true, fill: [254, 243, 199], bordered: true },
  );

  y = drawSectionTitle(doc, '1. This project', y, margin);
  y = drawRows(doc, guide.snapshotRows, y, margin);

  y = drawSectionTitle(doc, '2. Read this first', y, margin);
  y = drawParagraph(doc, guide.disclaimer, y, margin, { fill: [255, 247, 237], bordered: true });

  y = drawSectionTitle(doc, '3. Foundation & plinth', y, margin);
  y = drawRows(doc, guide.foundationRows, y, margin);

  y = drawSectionTitle(doc, '4. Columns', y, margin);
  y = drawRows(doc, guide.columnRows, y, margin);

  y = drawSectionTitle(doc, '5. Beams & lintels', y, margin);
  y = drawRows(doc, guide.beamRows, y, margin);

  y = drawSectionTitle(doc, '6. Slabs', y, margin);
  y = drawRows(doc, guide.slabRows, y, margin);

  y = drawSectionTitle(doc, '7. Steel fixing', y, margin);
  y = drawRows(doc, guide.steelRows, y, margin);

  y = drawSectionTitle(doc, '8. Clear cover & concrete', y, margin);
  y = drawRows(doc, guide.coverRows, y, margin);

  if (guide.masonryRows.length > 0) {
    y = drawSectionTitle(doc, '9. Walls, plaster & flooring', y, margin);
    y = drawRows(doc, guide.masonryRows, y, margin);
  }

  if (guide.assamRows.length > 0) {
    y = drawSectionTitle(doc, guide.masonryRows.length > 0 ? '10. Assam Type roof' : '9. Assam Type roof', y, margin);
    y = drawRows(doc, guide.assamRows, y, margin);
  }

  y = drawSectionTitle(doc, 'Site checklist', y, margin);
  y = drawRows(doc, guide.checklistRows, y, margin);

  y = drawParagraph(
    doc,
    'BuilBid issues this sheet to help the Mistri and client talk in the same numbers on site. Casting without an engineer’s drawing is at the parties’ own risk.',
    y,
    margin,
    { bordered: true },
  );

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}
