'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CONTRACTOR_CANNOT_POST_PROJECT_MESSAGE } from '@/lib/auth/roles';
import { clientSignOut } from '@/lib/auth/clientSignOut';
import { useProfile } from '@/lib/hooks/useProfile';

interface ContractorPostProjectBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractorPostProjectBlockedDialog({
  open,
  onOpenChange,
}: ContractorPostProjectBlockedDialogProps) {
  const router = useRouter();
  const { clearProfile } = useProfile();
  const [pending, setPending] = useState<'login' | 'register' | null>(null);

  async function goToOwnerAuth(path: string, kind: 'login' | 'register') {
    if (pending) return;
    setPending(kind);
    await clientSignOut(router, { redirectTo: path, onClear: clearProfile });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="z-[400] max-w-md"
        overlayClassName="z-[400]"
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden />
            <DialogTitle>Cannot post a project</DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
            {CONTRACTOR_CANNOT_POST_PROJECT_MESSAGE}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending !== null}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => goToOwnerAuth('/login?role=owner', 'login')}
            disabled={pending !== null}
          >
            {pending === 'login' ? 'Redirecting…' : 'Log in as Owner'}
          </Button>
          <Button
            type="button"
            onClick={() => goToOwnerAuth('/register?role=owner', 'register')}
            disabled={pending !== null}
          >
            {pending === 'register' ? 'Redirecting…' : 'Create Owner Account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
