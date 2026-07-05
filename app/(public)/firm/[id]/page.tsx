export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getPublicFirmProfileAction } from '@/app/actions/firm';
import { FirmPublicProfileView } from '@/components/firm/FirmPublicProfileView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicFirmProfilePage({ params }: PageProps) {
  const { id } = await params;
  const { firm, portfolio, error } = await getPublicFirmProfileAction(id);

  if (error || !firm) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <FirmPublicProfileView firm={firm} portfolio={portfolio} />
    </div>
  );
}
