'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContractorPostProjectBlockedDialog } from '@/components/auth/ContractorPostProjectBlockedDialog';

export function NewProjectContractorBlocked({ dashboardHref }: { dashboardHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      router.replace(dashboardHref);
    }
  }

  return <ContractorPostProjectBlockedDialog open={open} onOpenChange={handleOpenChange} />;
}
