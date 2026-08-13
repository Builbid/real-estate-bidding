export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { notFound } from 'next/navigation';
import { normalizeRole } from '@/lib/auth/roles';
import { CrossBiddingBlocked } from '@/components/firm/CrossBiddingBlocked';
import { RoleGuardBlocked } from '@/components/firm/RoleGuardBlocked';
import { FirmBidFetchError } from '@/components/firm/FirmBidFetchError';
import { FirmBiddingConsoleLoader } from './FirmBiddingConsoleLoader';
import { isFirmProject } from '@/lib/project/display';
import { sanitizeFirmBid, sanitizeFirmProject } from '@/lib/firm/sanitizeProject';
import { normalizeConstructionPackages } from '@/lib/firm/constructionClass';
import type { Bid, Profile, Project } from '@/lib/types';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

type PageData =
  | { blocked: 'wrong_role' | 'contractor_only' | 'fetch_error' | 'invalid_project' }
  | {
      blocked: null;
      profile: Profile;
      project: Project;
      existingBid: Bid | null;
      userId: string;
    };

async function getData(projectId: string): Promise<PageData> {
  try {
    const { supabase, userId, role, email, fullName } = await getAuthUser();

    const { error: expireError } = await supabase.rpc('expire_active_projects');
    if (expireError) {
      console.error('[FirmBidPage] expire_active_projects:', expireError.message);
    }

    const { data: dbProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[FirmBidPage] profile fetch:', profileError.message);
    }

    const effectiveRole = normalizeRole(dbProfile?.role ?? role);
    if (effectiveRole !== 'construction_firm') {
      return { blocked: 'wrong_role' };
    }

    const profile: Profile = dbProfile ?? {
      id: userId,
      email,
      full_name: fullName || 'Your Firm',
      role: effectiveRole,
      mobile: null,
      physical_address: null,
      pincode: null,
      company_name: null,
      logo_url: null,
      is_verified: false,
      created_at: '',
      updated_at: '',
    };

    const { data: projectRow, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError) {
      console.error('[FirmBidPage] project fetch:', projectError.message);
      return { blocked: 'fetch_error' };
    }

    if (!projectRow) {
      notFound();
    }

    const project = sanitizeFirmProject(projectRow as Record<string, unknown>);

    if (!project.id) {
      return { blocked: 'invalid_project' };
    }

    if (!isFirmProject(project)) {
      return { blocked: 'contractor_only' };
    }

    let existingBid: Bid | null = null;
    const { data: bidRow, error: bidError } = await supabase
      .from('bids')
      .select('*')
      .eq('project_id', projectId)
      .eq('builder_id', userId)
      .maybeSingle();

    if (bidError) {
      console.error('[FirmBidPage] existing bid fetch:', bidError.message);
    } else if (bidRow) {
      existingBid = sanitizeFirmBid(bidRow as Record<string, unknown>);
    }

    return {
      blocked: null,
      profile,
      project,
      existingBid,
      userId,
    };
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest: string }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_NOT_FOUND')
    ) {
      throw err;
    }
    console.error('[FirmBidPage] unexpected error:', err);
    return { blocked: 'fetch_error' };
  }
}

export default async function FirmBidPage({ params }: PageProps) {
  const { projectId } = await params;
  const data = await getData(projectId);

  if (data.blocked !== null) {
    if (data.blocked === 'wrong_role') {
      return (
        <RoleGuardBlocked
          message="This project requires a Construction Firm account."
          backHref="/dashboard/builder"
          backLabel="Back to Mistri Worker Console"
        />
      );
    }

    if (data.blocked === 'contractor_only') {
      return <CrossBiddingBlocked variant="contractor_only" backHref="/dashboard/firm" />;
    }

    return (
      <FirmBidFetchError
        message={
          data.blocked === 'invalid_project'
            ? 'This project could not be loaded. Please go back and try again.'
            : undefined
        }
      />
    );
  }

  const { project, existingBid, profile, userId } = data;

  return (
    <FirmBiddingConsoleLoader
      project={project}
      existingBid={existingBid}
      firmId={userId}
      companyName={profile.company_name ?? profile.full_name ?? 'Your Firm'}
      logoUrl={profile.logo_url ?? null}
      packages={normalizeConstructionPackages(profile.construction_class_packages) ?? []}
    />
  );
}
