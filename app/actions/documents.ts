'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { backfillUserProjectDocuments } from '@/lib/documents/archiveProjectDocuments';
import { PROJECT_DOCUMENTS_BUCKET } from '@/lib/documents/constants';
import {
  DOCUMENT_TABLES,
  isMissingDocumentTable,
  routedDocumentsFromSnapshot,
} from '@/lib/documents/documentTables';
import type { ProjectDocument } from '@/lib/types';

const DOCUMENT_COLUMNS =
  'id, project_id, numeric_project_id, project_name, document_type, file_name, storage_path, file_url, mime_type, owner_id, worker_id, owner_deleted, worker_deleted, created_at, updated_at';

function visibleToUser(row: ProjectDocument, userId: string): boolean {
  const isOwner = row.owner_id === userId;
  const isWorker = row.worker_id === userId;
  if (isOwner && !row.owner_deleted) return true;
  if (isWorker && !row.worker_deleted) return true;
  return false;
}

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

  const collected: ProjectDocument[] = [];
  for (const table of DOCUMENT_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select(DOCUMENT_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingDocumentTable(error.message)) continue;
      return { documents: [], error: error.message };
    }
    collected.push(...((data ?? []) as ProjectDocument[]));
  }

  const { data: sharedRows, error: sharedError } = await supabase
    .from('shared_agreements')
    .select('project_id, owner_id, worker_id, snapshot, shared_at')
    .or(`owner_id.eq.${user.id},worker_id.eq.${user.id}`);
  if (!sharedError) {
    const seen = new Set(collected.map((row) => `${row.project_id}:${row.document_type}`));
    for (const shared of sharedRows ?? []) {
      for (const row of routedDocumentsFromSnapshot(shared.snapshot)) {
        const key = `${row.project_id}:${row.document_type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(row);
      }
    }
  }

  const documents = collected.filter((row) => visibleToUser(row, user.id));
  return { documents, error: null };
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
  revalidatePath('/dashboard/profile/documents');
  return { error: null };
}

export async function getProjectDocumentDownloadUrl(
  documentId: string,
  disposition: 'inline' | 'attachment' = 'attachment',
): Promise<{ url: string | null; inlineBase64?: string | null; fileName?: string; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: 'You must be signed in.' };

  let doc: {
    file_name?: string;
    storage_path?: string | null;
    file_url?: string | null;
    owner_id?: string;
    worker_id?: string | null;
  } | null = null;

  if (documentId.startsWith('routed:')) {
    const [, projectId, documentType] = documentId.split(':');
    const { data: shared } = await supabase
      .from('shared_agreements')
      .select('snapshot, owner_id, worker_id')
      .eq('project_id', projectId)
      .maybeSingle();
    const match = routedDocumentsFromSnapshot(shared?.snapshot).find(
      (row) => row.project_id === projectId && row.document_type === documentType,
    );
    if (match && (match.owner_id === user.id || match.worker_id === user.id)) doc = match;
  } else {
    for (const table of DOCUMENT_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('id, file_name, storage_path, file_url, mime_type, owner_id, worker_id')
        .eq('id', documentId)
        .maybeSingle();
      if (error && isMissingDocumentTable(error.message)) continue;
      if (data) {
        doc = data;
        break;
      }
    }
  }

  if (!doc || (doc.owner_id !== user.id && doc.worker_id !== user.id)) {
    return { url: null, error: 'Document not found.' };
  }

  const fileUrl = typeof doc.file_url === 'string' ? doc.file_url : '';
  if (fileUrl.startsWith('data:application/pdf;base64,')) {
    return {
      url: null,
      inlineBase64: fileUrl.slice('data:application/pdf;base64,'.length),
      fileName: doc.file_name as string,
      error: null,
    };
  }
  if (fileUrl && !doc.storage_path) {
    return { url: fileUrl, fileName: doc.file_name as string, error: null };
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
