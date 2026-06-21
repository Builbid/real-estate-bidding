import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { BiddingConsole } from './BiddingConsole';
import type { Project, Bid } from '@/lib/types';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function getData(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role !== 'builder') redirect('/dashboard');

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) notFound();

  const { data: existingBid } = await supabase
    .from('bids')
    .select('*')
    .eq('project_id', projectId)
    .eq('builder_id', user.id)
    .maybeSingle();

  return {
    project: project as Project,
    existingBid: existingBid as Bid | null,
    userId: user.id,
    profile,
  };
}

export default async function BidPage({ params }: PageProps) {
  const { projectId } = await params;
  const { project, existingBid, userId, profile } = await getData(projectId);

  if (project.status !== 'active_24h') {
    redirect('/dashboard/builder');
  }

  return (
    <BiddingConsole
      project={project}
      existingBid={existingBid}
      builderId={userId}
      builderName={profile.full_name}
    />
  );
}
