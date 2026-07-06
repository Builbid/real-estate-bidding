'use client';

import dynamic from 'next/dynamic';
import { FirmBidPageSkeleton } from '@/components/firm/FirmBidPageSkeleton';
import type { Project, Bid } from '@/lib/types';

const FirmBiddingConsole = dynamic(
  () => import('./FirmBiddingConsole').then((m) => m.FirmBiddingConsole),
  { ssr: false, loading: () => <FirmBidPageSkeleton /> },
);

interface Props {
  project: Project;
  existingBid: Bid | null;
  firmId: string;
  companyName: string;
  logoUrl?: string | null;
}

export function FirmBiddingConsoleLoader(props: Props) {
  return <FirmBiddingConsole {...props} />;
}
