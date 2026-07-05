'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface Props {
  projectId: string;
  projectTitle: string;
}

export function DeleteProjectButton({ projectId, projectTitle }: Props) {
  const router   = useRouter();
  const supabase = createClient();

  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Delete project"
        aria-label="Delete project"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Confirmation modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !loading && setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => !loading && setOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + heading */}
            <div className="flex flex-col items-center text-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Project?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  This will permanently delete{' '}
                  <span className="font-semibold text-foreground">"{projectTitle}"</span>{' '}
                  and all associated bids. This action cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-foreground transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {loading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
