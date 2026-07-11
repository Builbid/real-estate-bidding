'use client';

import { useState } from 'react';
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

  async function handleYes() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
        </DialogHeader>
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
