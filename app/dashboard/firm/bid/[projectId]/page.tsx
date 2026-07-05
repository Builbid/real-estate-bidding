export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect, notFound } from 'next/navigation';
import { CrossBiddingBlocked } from '@/components/firm/CrossBiddingBlocked';
import { FirmBiddingConsole } from './FirmBiddingConsole';
import { isFirmProject } from '@/lib/project/display';
import type { Project, Bid } from '@/lib/types';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function getData(projectId: string) {
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const profile = dbProfile ?? {
    id: userId, email, full_name: fullName, role,
    mobile: null, physical_address: null, pincode: null,
    company_name: null, logo_url: null,
    created_at: '', updated_at: '',
  };

  if (profile.role !== 'construction_firm') redirect('/dashboard');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) notFound();

  if (!isFirmProject(project as Project)) {
    return { blocked: 'contractor_only' as const, profile: null, project: null, existingBid: null };
  }

  const { data: existingBid } = await supabase
    .from('bids')
    .select('*')
    .eq('project_id', projectId)
    .eq('builder_id', userId)
    .maybeSingle();

  return {
    blocked: null,
    profile,
    project: project as Project,
    existingBid: existingBid as Bid | null,
    userId,
  };
}

export default async function FirmBidPage({ params }: PageProps) {
  const { projectId } = await params;
  const data = await getData(projectId);

  if (data.blocked === 'contractor_only') {
    return <CrossBiddingBlocked variant="contractor_only" backHref="/dashboard/firm" />;
  }

  const { project, existingBid, profile, userId } = data;
  if (!project || !profile) notFound();

  const inGracePeriod =
    project.status === 'frozen_24h' &&
    project.selection_ends_at != null &&
    new Date(project.selection_ends_at) > new Date();

  if (project.status !== 'active_24h' && !inGracePeriod) {
    redirect('/dashboard/firm');
  }

  return (
    <FirmBiddingConsole
      project={project}
      existingBid={existingBid}
      firmId={userId!}
      companyName={profile.company_name ?? profile.full_name}
      logoUrl={profile.logo_url}
    />
  );
}
