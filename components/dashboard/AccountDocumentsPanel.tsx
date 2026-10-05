import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { getAuthUser } from '@/lib/supabase/getUser';
import { PROJECT_DOCUMENT_TYPE_LABEL, type ProjectDocumentType } from '@/lib/documents/constants';

/** Agreement and quality-control files shared into this account's document section. */
export async function AccountDocumentsPanel() {
  const { supabase, userId } = await getAuthUser();
  const { data, error } = await supabase
    .from('project_documents')
    .select('id, project_name, document_type, file_name, numeric_project_id, owner_id, worker_id, owner_deleted, worker_deleted')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error || !data || data.length === 0) return null;

  const documents = data.filter((row) => {
    if (row.document_type !== 'agreement' && row.document_type !== 'quality_control') return false;
    if (row.owner_id === userId && row.owner_deleted) return false;
    if (row.worker_id === userId && row.worker_deleted) return false;
    return true;
  });
  if (documents.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Project documents">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-emerald-500" />
        <h2 className="text-base font-semibold text-foreground">Documents</h2>
        <Link href="/dashboard/profile/documents" className="text-xs font-semibold text-emerald-600">
          Open document section
        </Link>
      </div>
      <div className="space-y-2">
        {documents.map((doc) => {
          const type = doc.document_type as ProjectDocumentType;
          return (
            <article key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{doc.project_name}</p>
                <p className="text-xs text-muted-foreground">
                  {PROJECT_DOCUMENT_TYPE_LABEL[type] ?? type}
                  {doc.numeric_project_id ? ` · ${doc.numeric_project_id}` : ''}
                </p>
              </div>
              <a
                href={`/api/documents/file?id=${encodeURIComponent(doc.id)}&disposition=inline`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-600"
              >
                View PDF
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
