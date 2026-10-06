import type { SupabaseClient } from '@supabase/supabase-js';
import {
  documentFileName,
  documentStoragePath,
  isNumericProjectId,
  PROJECT_DOCUMENTS_BUCKET,
  type ProjectDocumentType,
} from '@/lib/documents/constants';
import { upsertPartyDocument } from '@/lib/documents/documentTables';
import type { ProjectDocument } from '@/lib/types';

async function storePdf(options: {
  admin: SupabaseClient;
  projectId: string;
  numericId: string;
  projectName: string;
  ownerId: string;
  workerId: string;
  type: ProjectDocumentType;
  bytes: Uint8Array;
}): Promise<{ error?: string; fallback?: ProjectDocument }> {
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
  const row = {
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
  };
  const saved = await upsertPartyDocument(options.admin, row);
  if (saved.ok) return {};
  if (saved.missing) {
    return {
      fallback: {
        id: `routed:${options.projectId}:${options.type}`,
        ...row,
        storage_path: storedPath,
        file_url: fileUrl,
        created_at: now,
      },
    };
  }
  return { error: saved.error };
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
}): Promise<{ error?: string; fallbackDocuments?: ProjectDocument[] }> {
  const fallbackDocuments: ProjectDocument[] = [];
  const agreement = await storePdf({ ...options, type: 'agreement', bytes: options.agreementBytes });
  if (agreement.error) return agreement;
  if (agreement.fallback) fallbackDocuments.push(agreement.fallback);
  if (options.qualityControlBytes) {
    const qualityControl = await storePdf({
      ...options,
      type: 'quality_control',
      bytes: options.qualityControlBytes,
    });
    if (qualityControl.error) return qualityControl;
    if (qualityControl.fallback) fallbackDocuments.push(qualityControl.fallback);
  }
  if (!options.checklistBytes) {
    return fallbackDocuments.length > 0 ? { fallbackDocuments } : {};
  }
  const checklist = await storePdf({ ...options, type: 'site_checklist', bytes: options.checklistBytes });
  if (!checklist.error && checklist.fallback) fallbackDocuments.push(checklist.fallback);
  return fallbackDocuments.length > 0 ? { fallbackDocuments } : {};
}
