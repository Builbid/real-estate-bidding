'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, FileText, FolderOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hideProjectDocumentAction } from '@/app/actions/documents';
import { PROJECT_DOCUMENT_TYPE_LABEL } from '@/lib/documents/constants';
import type { ProjectDocument, ProjectDocumentType } from '@/lib/types';

interface DocumentsSectionProps {
  documents: ProjectDocument[];
}

export function DocumentsSection({ documents }: DocumentsSectionProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openFile(id: string, disposition: 'inline' | 'attachment') {
    window.open(`/api/documents/file?id=${encodeURIComponent(id)}&disposition=${disposition}`, '_blank', 'noopener,noreferrer');
  }

  function handleRemove(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await hideProjectDocumentAction(id);
      setPendingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section>
      <h2 className="mb-1 inline-flex items-center gap-2 text-base font-semibold text-foreground">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        Documents
      </h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Agreement copies, cost estimates, and AI design files share one numeric Project ID and stay backed up on the BuilBid server. Remove hides a file from your view only.
      </p>

      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {documents.length === 0 ? (
          <div>
            <FileText className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No project documents yet</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              When an agreement or estimate is finalized, the files appear here for both the homeowner and the worker.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const type = doc.document_type as ProjectDocumentType;
            const busy = isPending && pendingId === doc.id;
            return (
              <div
                key={doc.id}
                className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{doc.project_name}</p>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {PROJECT_DOCUMENT_TYPE_LABEL[type] ?? type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Project ID <span className="font-mono font-semibold text-foreground">{doc.numeric_project_id}</span>
                    <span className="mx-1.5">·</span>
                    {doc.file_name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openFile(doc.id, 'inline')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openFile(doc.id, 'attachment')}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-500"
                    disabled={busy}
                    onClick={() => handleRemove(doc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {busy ? 'Removing…' : 'Remove'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
