import { generateProjectDocumentPdfBytes } from '@/lib/documents/pdf';
import { qualityControlProfileForService } from '@/lib/contract/qualityControl';

export function generateQualityControlPdfBytes(input: {
  serviceType: string | null;
  projectName: string;
  numericProjectId: string;
  ownerName: string;
  workerName: string;
}): Uint8Array {
  const profile = qualityControlProfileForService(input.serviceType);
  const rows = profile.sections.flatMap((section) =>
    section.points.map((point, index) => ({
      label: index === 0 ? section.heading : '',
      value: point,
    })),
  );
  return generateProjectDocumentPdfBytes({
    title: 'Quality Control Form',
    subtitle: profile.title,
    numericProjectId: input.numericProjectId || 'Project',
    projectName: input.projectName,
    notice: `${profile.intro} Home owner: ${input.ownerName}. Mistri / worker: ${input.workerName}.`,
    rows,
  });
}
