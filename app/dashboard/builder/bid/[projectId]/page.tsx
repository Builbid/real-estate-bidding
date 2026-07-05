export const dynamic = 'force-dynamic'

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect, notFound } from 'next/navigation';
import { CrossBiddingBlocked } from '@/components/firm/CrossBiddingBlocked';
import { BiddingConsole } from './BiddingConsole';
import { isFirmProject } from '@/lib/project/display';
import type { Project, Bid } from '@/lib/types';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function getData(projectId: string) {
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const profile = dbProfile ?? { id: userId, email, full_name: fullName, role, mobile: null, physical_address: null, pincode: null, created_at: '', updated_at: '' };
  if (profile.role !== 'labour_contractor') redirect('/dashboard');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) notFound();

  if (isFirmProject(project as Project)) {
    return { blocked: 'firm_only' as const, project: null, existingBid: null, userId, profile: null };
  }

  const { data: existingBid } = await supabase
    .from('bids')
    .select('*')
    .eq('project_id', projectId)
    .eq('builder_id', userId)
    .maybeSingle();

  return {
    blocked: null as null,
    project: project as Project,
    existingBid: existingBid as Bid | null,
    userId,
    profile,
  };
}

export default async function BidPage({ params }: PageProps) {
  const { projectId } = await params;
  const data = await getData(projectId);

  if (data.blocked === 'firm_only') {
    return <CrossBiddingBlocked variant="firm_only" backHref="/dashboard/builder" />;
  }

  const { project, existingBid, userId, profile } = data;
  if (!project || !profile) notFound();

  // Allow access during active bidding OR during the 24h grace period (frozen_24h)
  const inGracePeriod =
    project.status === 'frozen_24h' &&
    project.selection_ends_at != null &&
    new Date(project.selection_ends_at) > new Date();

  if (project.status !== 'active_24h' && !inGracePeriod) {
    redirect('/dashboard/builder');
  }

  return (
    <BiddingConsole
      project={project}
      existingBid={existingBid}
      builderId={userId}
      builderName={profile.full_name}
      builderAvatarUrl={profile.avatar_url}
    />
  );
}
