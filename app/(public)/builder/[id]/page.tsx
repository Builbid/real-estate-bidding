import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { Navbar } from '@/components/shared/Navbar';
import { WorkerExperienceProfile } from '@/components/workers/WorkerExperienceProfile';
import { getDemoLabourProfile, isDemoLabourSlug } from '@/lib/data/demoPortfolios';
import { getPublicWorkerProfile } from '@/lib/workers/getPublicWorkerProfile';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (isDemoLabourSlug(id)) {
    const profile = getDemoLabourProfile(id);
    return {
      title: profile ? `${profile.companyName} — Portfolio` : 'Contractor Portfolio',
      description: profile?.about,
    };
  }

  const live = await getPublicWorkerProfile(id);
  return {
    title: live ? `${live.name} — Portfolio` : 'Contractor Portfolio',
    description: live
      ? `${live.name} completed projects and years of experience on BuilBid.`
      : undefined,
  };
}

export default async function WorkerPortfolioPage({ params }: PageProps) {
  const { id } = await params;

  const demo = isDemoLabourSlug(id) ? getDemoLabourProfile(id) : null;
  const live = demo ? null : await getPublicWorkerProfile(id);
  if (!demo && !live) notFound();

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <HistoryBackButton className="mb-6" />
        {demo ? (
          <WorkerExperienceProfile
            name={demo.companyName}
            locationLabel={`${demo.location}, Assam`}
            specialty={demo.specialty}
            avatarUrl={demo.logoUrl}
            yearsOfExperience={demo.yearsInBusiness}
            isVerified={demo.isVerified}
            about={demo.about}
            portfolio={demo.portfolio}
          />
        ) : live ? (
          <WorkerExperienceProfile
            name={live.name}
            specialty={live.specialty}
            avatarUrl={live.avatarUrl}
            yearsOfExperience={live.yearsOfExperience}
            isVerified={live.isVerified}
            portfolio={live.portfolio}
          />
        ) : null}
      </div>
    </>
  );
}
