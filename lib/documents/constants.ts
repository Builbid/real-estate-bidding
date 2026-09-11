export const PROJECT_DOCUMENTS_BUCKET = 'project-documents';

export const PROJECT_DOCUMENT_TYPES = ['agreement', 'estimate', 'ai_design'] as const;

export type ProjectDocumentType = (typeof PROJECT_DOCUMENT_TYPES)[number];

export const PROJECT_DOCUMENT_TYPE_LABEL: Record<ProjectDocumentType, string> = {
  agreement: 'Agreement',
  estimate: 'Estimate',
  ai_design: 'AI Design',
};

export function isNumericProjectId(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9]{6}$/.test(value.trim()));
}

export function documentFileName(
  type: ProjectDocumentType,
  numericId: string,
  ext = 'pdf',
): string {
  const id = isNumericProjectId(numericId) ? numericId.trim() : 'project';
  if (type === 'agreement') return `Agreement-Copy-${id}.${ext}`;
  if (type === 'estimate') return `Cost-Estimate-${id}.${ext}`;
  return `AI-Design-${id}.${ext}`;
}

export function documentStoragePath(
  numericId: string,
  type: ProjectDocumentType,
  ext = 'pdf',
): string {
  const id = isNumericProjectId(numericId) ? numericId.trim() : '000000';
  return `${id}/${type}.${ext}`;
}
