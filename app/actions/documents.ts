'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { backfillUserProjectDocuments } from '@/lib/documents/archiveProjectDocuments';
import { PROJECT_DOCUMENTS_BUCKET, type ProjectDocumentType } from '@/lib/documents/constants';
import type { ProjectDocument } from '@/lib/types';

export async function listMyProjectDocumentsAction(): Promise<{
  documents: ProjectDocument[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { documents: [], error: 'You must be signed in.' };

  await backfillUserProjectDocuments(user.id);

  const { data, error } = await supabase
    .from('project_documents')
    .select(
      'id, project_id, numeric_project_id, project_name, document_type, file_name, storage_path, file_url, mime_type, owner_id, worker_id, owner_deleted, worker_deleted, created_at, updated_at',
    )
    .order('created_at', { ascending: false });

  if (error) {
    if (/does not exist|schema cache|project_documents/i.test(error.message)) {
      return { documents: [], error: null };
    }
    return { documents: [], error: error.message };
  }

  return { documents: (data ?? []) as ProjectDocument[], error: null };
}

export async function hideProjectDocumentAction(
  documentId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { error } = await supabase.rpc('hide_own_project_document', {
    p_document_id: documentId,
  });

  if (error) {
    return { error: error.message || 'Could not remove this document from your view.' };
  }

  revalidatePath('/dashboard/profile');
  return { error: null };
}

export async function getProjectDocumentDownloadUrl(
  documentId: string,
  disposition: 'inline' | 'attachment' = 'attachment',
): Promise<{ url: string | null; fileName?: string; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: 'You must be signed in.' };

  const { data: doc, error } = await supabase
    .from('project_documents')
    .select('id, file_name, storage_path, file_url, mime_type, owner_id, worker_id')
    .eq('id', documentId)
    .maybeSingle();

  if (error || !doc) {
    return { url: null, error: 'Document not found.' };
  }

  if (doc.file_url && !doc.storage_path) {
    return { url: doc.file_url as string, fileName: doc.file_name, error: null };
  }

  if (!doc.storage_path) {
    return { url: null, error: 'No file is stored for this document.' };
  }

  try {
    const admin = createAdminClient();
    const { data: signed, error: signedError } = await admin.storage
      .from(PROJECT_DOCUMENTS_BUCKET)
      .createSignedUrl(
        doc.storage_path as string,
        120,
        disposition === 'attachment' ? { download: doc.file_name as string } : undefined,
      );

    if (signedError || !signed?.signedUrl) {
      return { url: null, error: signedError?.message || 'Could not create a download link.' };
    }

    return { url: signed.signedUrl, fileName: doc.file_name as string, error: null };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : 'Could not create a download link.',
    };
  }
}

export type { ProjectDocumentType };
