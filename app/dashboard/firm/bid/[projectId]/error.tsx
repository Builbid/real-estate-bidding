'use client';

import { useEffect } from 'react';
import { BidPageError } from '@/components/bid/BidPageError';

export default function FirmBidError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error('[FirmBidPage] client error:', error);
  }, [error]);

  return <BidPageError dashboardHref="/dashboard/firm" dashboardLabel="Back to Firm Console" />;
}
