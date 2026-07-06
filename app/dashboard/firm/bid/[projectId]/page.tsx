export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { notFound } from 'next/navigation';
import { normalizeRole } from '@/lib/auth/roles';
import { CrossBiddingBlocked } from '@/components/firm/CrossBiddingBlocked';
import { RoleGuardBlocked } from '@/components/firm/RoleGuardBlocked';
import { FirmBiddingConsole } from './FirmBiddingConsole';
import { isFirmProject } from '@/lib/project/display';
import type { Project, Bid } from '@/lib/types';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

async function getData(projectId: string) {
  const { supabase, userId, role, email, fullName } = await getAuthUser();

  await supabase.rpc('expire_active_projects');

  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const effectiveRole = normalizeRole(dbProfile?.role ?? role);

  if (effectiveRole !== 'construction_firm') {
    return { blocked: 'wrong_role' as const, profile: null, project: null, existingBid: null, userId };
  }

  const profile = dbProfile ?? {
    id: userId,
    email,
    full_name: fullName,
    role: effectiveRole,
    mobile: null,
    physical_address: null,
    pincode: null,
    company_name: null,
    logo_url: null,
    created_at: '',
    updated_at: '',
  };

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  if (!project) notFound();

  if (!isFirmProject(project as Project)) {
    return { blocked: 'contractor_only' as const, profile: null, project: null, existingBid: null, userId };
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

  if (data.blocked === 'wrong_role') {
    return (
      <RoleGuardBlocked
        message="This project requires a Construction Firm account."
        backHref="/dashboard/builder"
        backLabel="Back to Contractor Console"
      />
    );
  }

  if (data.blocked === 'contractor_only') {
    return <CrossBiddingBlocked variant="contractor_only" backHref="/dashboard/firm" />;
  }

  const { project, existingBid, profile, userId } = data;
  if (!project || !profile) notFound();

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
