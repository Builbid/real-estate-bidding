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

  const { error: uploadError } = await options.admin.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .upload(storagePath, options.bytes, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '3600',
    });
  if (uploadError) return { error: uploadError.message || 'Could not store the PDF.' };

  const now = new Date().toISOString();
  const { error } = await options.admin.from('project_documents').upsert(
    {
      project_id: options.projectId,
      numeric_project_id: publicId,
      project_name: options.projectName,
      document_type: options.type,
      file_name: fileName,
      storage_path: storagePath,
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
    if (message.includes('quality_control') || message.includes('invalid input value for enum')) {
      return {
        error:
          'Database is missing the quality-control document type. Run supabase/migrations/064_agreement_dates_and_quality_control.sql in the Supabase SQL Editor, then share again.',
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
  qualityControlBytes: Uint8Array;
}): Promise<{ error?: string }> {
  const agreement = await storePdf({ ...options, type: 'agreement', bytes: options.agreementBytes });
  if (agreement.error) return agreement;
  return storePdf({ ...options, type: 'quality_control', bytes: options.qualityControlBytes });
}
