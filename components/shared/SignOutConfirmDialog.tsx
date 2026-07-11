'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SignOutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export function SignOutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: SignOutConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPending(false);
      setError(null);
    }
  }, [open]);

  function handleYes() {
    setPending(true);
    setError(null);

    try {
      const result = onConfirm();
      if (result && typeof (result as Promise<void>).then === 'function') {
        void (result as Promise<void>).catch((err: unknown) => {
          console.error('[SignOutConfirmDialog] Sign out failed:', err);
          setError('Could not sign out. Please try again.');
          setPending(false);
        });
      }
      onOpenChange(false);
    } catch (err) {
      console.error('[SignOutConfirmDialog] Sign out failed:', err);
      setError('Could not sign out. Please try again.');
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
        </DialogHeader>
        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            No
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleYes}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing out…
              </>
            ) : (
              'Yes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
