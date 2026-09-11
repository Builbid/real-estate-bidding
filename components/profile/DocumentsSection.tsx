'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, FileText, FolderOpen, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hideProjectDocumentAction } from '@/app/actions/documents';
import { PROJECT_DOCUMENT_TYPE_LABEL, type ProjectDocumentType } from '@/lib/documents/constants';
import type { ProjectDocument } from '@/lib/types';

const TYPE_BADGE: Record<ProjectDocumentType, 'indigo' | 'teal' | 'violet'> = {
  agreement: 'indigo',
  estimate: 'teal',
  ai_design: 'violet',
};

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
    <Card className="border-border bg-card/80 dark:bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base inline-flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-sky-700 dark:text-sky-400" />
          Documents
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Agreement copies, cost estimates, and AI design files share one numeric Project ID and stay backed up on the BuilBid server. Remove hides a file from your view only.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center dark:bg-muted/10">
            <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No project documents yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
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
                className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/10"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{doc.project_name}</p>
                    <Badge variant={TYPE_BADGE[type] ?? 'default'}>
                      {PROJECT_DOCUMENT_TYPE_LABEL[type] ?? type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Project ID <span className="font-mono font-semibold text-foreground">{doc.numeric_project_id}</span>
                    <span className="mx-1.5 text-border">·</span>
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
      </CardContent>
    </Card>
  );
}
