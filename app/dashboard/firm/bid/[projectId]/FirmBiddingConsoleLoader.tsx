'use client';

import dynamic from 'next/dynamic';
import { FirmBidPageSkeleton } from '@/components/firm/FirmBidPageSkeleton';
import type { Project, Bid, FirmConstructionPackage } from '@/lib/types';

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
  packages: FirmConstructionPackage[];
}

export function FirmBiddingConsoleLoader(props: Props) {
  return <FirmBiddingConsole {...props} />;
}
