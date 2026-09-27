import type { Metadata } from 'next';
import { WorkersDirectoryContent } from '@/components/workers/WorkersDirectoryContent';
import { getRankedWorkers } from '@/lib/workers/getRankedWorkers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Skilled Workers',
  description:
    'Browse ranked skilled workers and trade professionals on BuilBid — filter by category and sort by rating.',
};

export default async function WorkersPage() {
  const workers = await getRankedWorkers();
  return <WorkersDirectoryContent workers={workers} />;
}
