import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { DemoLabourPortfolioView } from '@/components/marketing/DemoLabourPortfolioView';
import { getDemoLabourProfile, isDemoLabourSlug } from '@/lib/data/demoPortfolios';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isDemoLabourSlug(id)) return { title: 'Contractor Portfolio' };
  const profile = getDemoLabourProfile(id);
  return {
    title: profile ? `${profile.companyName} — Portfolio` : 'Contractor Portfolio',
    description: profile?.about,
  };
}

export default async function DemoBuilderPortfolioPage({ params }: PageProps) {
  const { id } = await params;

  if (!isDemoLabourSlug(id)) notFound();

  const profile = getDemoLabourProfile(id);
  if (!profile) notFound();

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <DemoLabourPortfolioView profile={profile} />
      </div>
    </>
  );
}
