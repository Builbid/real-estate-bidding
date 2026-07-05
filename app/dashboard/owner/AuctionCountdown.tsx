'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { triggerProjectTransition } from '@/app/actions/auction';

interface Props {
  targetDateISO: string;
  projectId: string;
  compact?: boolean;
}

/**
 * A CountdownTicker that, when it hits zero, calls the server action to
 * transition the project status and then refreshes the page.
 */
export function AuctionCountdown({ targetDateISO, projectId, compact }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleExpire() {
    startTransition(async () => {
      await triggerProjectTransition(projectId);
      router.refresh();
    });
  }

  return (
    <CountdownTicker
      targetDateISO={targetDateISO}
      compact={compact}
      onExpire={handleExpire}
    />
  );
}
