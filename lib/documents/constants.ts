export const PROJECT_DOCUMENTS_BUCKET = 'project-documents';

export const PROJECT_DOCUMENT_TYPES = [
  'agreement',
  'estimate',
  'ai_design',
  'quality_control',
  'site_checklist',
] as const;

export type ProjectDocumentType = (typeof PROJECT_DOCUMENT_TYPES)[number];

/** Files routed onto a profile from the account's BuilBid ID. */
export const PROFILE_ROUTED_DOCUMENT_TYPES = ['agreement', 'quality_control'] as const;

export type ProfileRoutedDocumentType = (typeof PROFILE_ROUTED_DOCUMENT_TYPES)[number];

export function isProfileRoutedDocument(type: string): type is ProfileRoutedDocumentType {
  return (PROFILE_ROUTED_DOCUMENT_TYPES as readonly string[]).includes(type);
}

/** Payment invoices, platform receipts, and transaction records on a profile. */
export const INVOICE_DOCUMENT_TYPES = [
  'invoice',
  'payment_invoice',
  'receipt',
  'billing_receipt',
  'transaction',
] as const;

export function isInvoiceDocument(type: string): boolean {
  return (INVOICE_DOCUMENT_TYPES as readonly string[]).includes(type);
}

export function isProfileHubDocument(type: string): boolean {
  return isProfileRoutedDocument(type) || isInvoiceDocument(type);
}

export const PROJECT_DOCUMENT_TYPE_LABEL: Record<ProjectDocumentType, string> = {
  agreement: 'Agreement',
  estimate: 'Estimate',
  ai_design: 'AI Design',
  quality_control: 'Quality Control',
  site_checklist: 'Site Checklist',
};

/** Public project ID: 4 letters + 4 digits, interleaved (e.g. K7M2Q9P1). */
export const PUBLIC_PROJECT_ID_PATTERN = /^[A-Z][0-9][A-Z][0-9][A-Z][0-9][A-Z][0-9]$/i;

export function isPublicProjectId(value: string | null | undefined): value is string {
  return Boolean(value && PUBLIC_PROJECT_ID_PATTERN.test(value.trim()));
}

/** Accepts the current public ID format and legacy 6-digit numeric IDs. */
export function isNumericProjectId(value: string | null | undefined): value is string {
  const raw = value?.trim() ?? '';
  return isPublicProjectId(raw) || /^[0-9]{6}$/.test(raw);
}

export function documentFileName(
  type: ProjectDocumentType,
  numericId: string,
  ext = 'pdf',
): string {
  const id = isNumericProjectId(numericId) ? numericId.trim() : 'project';
  if (type === 'agreement') return `Agreement-Copy.${ext}`;
  if (type === 'estimate') return `Cost-Estimate-${id}.${ext}`;
  if (type === 'quality_control') return `Quality-Control.${ext}`;
  if (type === 'site_checklist') return `Site-Checklist-${id}.${ext}`;
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

/** Name shown and downloaded on the profile. Agreement IDs stay in the folder header only. */
export function presentedDocumentFileName(type: string | null | undefined, storedName?: string | null): string {
  if (type === 'agreement') return 'Agreement-Copy.pdf';
  if (type === 'quality_control') return 'Quality-Control.pdf';
  const stored = storedName?.trim();
  return stored || 'document.pdf';
}
