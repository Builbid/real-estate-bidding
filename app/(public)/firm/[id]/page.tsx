export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { getPublicFirmProfileAction } from '@/app/actions/firm';
import { FirmPublicProfileView } from '@/components/firm/FirmPublicProfileView';
import { Navbar } from '@/components/shared/Navbar';
import { getDemoFirmProfile, isDemoFirmSlug } from '@/lib/data/demoPortfolios';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicFirmProfilePage({ params }: PageProps) {
  const { id } = await params;

  if (isDemoFirmSlug(id)) {
    const demo = getDemoFirmProfile(id);
    if (!demo) notFound();

    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <HistoryBackButton className="mb-6" />
          <FirmPublicProfileView
            firm={demo.firm}
            portfolio={demo.portfolio}
            aboutText={demo.about}
            rating={demo.rating}
            reviewCount={demo.reviewCount}
            specialty={demo.specialty}
          />
        </div>
      </>
    );
  }

  const { firm, portfolio, error } = await getPublicFirmProfileAction(id);

  if (error || !firm) notFound();

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <HistoryBackButton className="mb-6" />
        <FirmPublicProfileView firm={firm} portfolio={portfolio} />
      </div>
    </>
  );
}
