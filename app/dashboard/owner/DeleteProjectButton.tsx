'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { deleteOwnerProjectAction } from '@/app/actions/project';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  projectId: string;
  projectTitle: string;
}

export function DeleteProjectButton({ projectId, projectTitle }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await deleteOwnerProjectAction(projectId);

    if (deleteError) {
      setError(deleteError);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Delete project"
        aria-label="Delete project"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!loading) setOpen(next);
        }}
      >
        <DialogContent
          className="max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <DialogTitle>Are you sure you want to delete?</DialogTitle>
            <DialogDescription className="text-xs">
              <span className="font-semibold text-foreground">&quot;{projectTitle}&quot;</span>{' '}
              and all associated bids will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              No, keep it
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {loading ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
