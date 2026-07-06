'use client';

import { BidPageError } from '@/components/bid/BidPageError';

export default function FirmBidError() {
  return <BidPageError dashboardHref="/dashboard/firm" dashboardLabel="Back to Firm Console" />;
}
