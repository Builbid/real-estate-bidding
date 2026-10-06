import type { SupabaseClient } from '@supabase/supabase-js';
import {
  documentFileName,
  documentStoragePath,
  isNumericProjectId,
  PROJECT_DOCUMENTS_BUCKET,
  type ProjectDocumentType,
} from '@/lib/documents/constants';

async function storePdf(options: {
  admin: SupabaseClient;
  projectId: string;
  numericId: string;
  projectName: string;
  ownerId: string;
  workerId: string;
  type: ProjectDocumentType;
  bytes: Uint8Array;
}): Promise<{ error?: string }> {
  const publicId = isNumericProjectId(options.numericId) ? options.numericId.trim() : options.projectId;
  const fileName = documentFileName(options.type, publicId, 'pdf');
  const storagePath = isNumericProjectId(publicId)
    ? documentStoragePath(publicId, options.type, 'pdf')
    : `${options.projectId}/${options.type}.pdf`;

  let storedPath: string | null = storagePath;
  let fileUrl: string | null = null;
  const { error: uploadError } = await options.admin.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .upload(storagePath, options.bytes, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '3600',
    });
  if (uploadError) {
    if (!/bucket not found/i.test(uploadError.message ?? '')) {
      return { error: uploadError.message || 'Could not store the PDF.' };
    }
    // The storage bucket is not provisioned. Keep the PDF on the document row itself.
    storedPath = null;
    fileUrl = `data:application/pdf;base64,${Buffer.from(options.bytes).toString('base64')}`;
  }

  const now = new Date().toISOString();
  const { error } = await options.admin.from('project_documents').upsert(
    {
      project_id: options.projectId,
      numeric_project_id: publicId,
      project_name: options.projectName,
      document_type: options.type,
      file_name: fileName,
      storage_path: storedPath,
      file_url: fileUrl,
      mime_type: 'application/pdf',
      owner_id: options.ownerId,
      worker_id: options.workerId,
      owner_deleted: false,
      worker_deleted: false,
      updated_at: now,
    },
    { onConflict: 'project_id,document_type' },
  );
  if (error) {
    const message = error.message.toLowerCase();
    if (options.type === 'quality_control' && (message.includes('quality_control') || message.includes('invalid input value for enum'))) {
      return {
        error:
          'Database is missing the quality-control document type. Run supabase/migrations/064_agreement_dates_and_quality_control.sql in the Supabase SQL Editor, then share again.',
      };
    }
    if (options.type === 'site_checklist' && (message.includes('site_checklist') || message.includes('invalid input value for enum'))) {
      return {
        error:
          'Database is missing the site-checklist document type. Run supabase/migrations/065_site_checklist_documents.sql in the Supabase SQL Editor, then share again.',
      };
    }
    return { error: error.message };
  }
  return {};
}

/** Puts the agreement PDF and the project QC form into both parties' document sections. */
export async function publishAgreementPackage(options: {
  admin: SupabaseClient;
  projectId: string;
  numericId: string;
  projectName: string;
  ownerId: string;
  workerId: string;
  agreementBytes: Uint8Array;
  /** Stored only for civil / mistri work. Other trades still generate the PDF before this call. */
  qualityControlBytes: Uint8Array | null;
  /** Site visit checklist PDF, stored when a checklist exists for this project. */
  checklistBytes?: Uint8Array | null;
}): Promise<{ error?: string }> {
  const agreement = await storePdf({ ...options, type: 'agreement', bytes: options.agreementBytes });
  if (agreement.error) return agreement;
  if (options.qualityControlBytes) {
    const qualityControl = await storePdf({
      ...options,
      type: 'quality_control',
      bytes: options.qualityControlBytes,
    });
    if (qualityControl.error) return qualityControl;
  }
  if (!options.checklistBytes) return {};
  const checklist = await storePdf({ ...options, type: 'site_checklist', bytes: options.checklistBytes });
  if (checklist.error && /site-checklist document type/i.test(checklist.error)) return {};
  return checklist;
}
