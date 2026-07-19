import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AllProjectsPageContent } from '@/components/projects/AllProjectsPageContent';
import { fetchActiveProjectsPage } from '@/lib/projects/fetchActiveProjectsPage';
import { normalizeRole } from '@/lib/auth/roles';

export const metadata: Metadata = {
  title: 'All Projects',
  description:
    'Browse all live construction bidding projects on BuilBid. Search by location or project name.',
};

async function getAuthRole(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: sp } = await supabase
      .from('service_providers')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (sp) return 'service_provider';

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return normalizeRole(profile?.role);
  } catch {
    return null;
  }
}

export default async function AllProjectsPage() {
  const [page, role] = await Promise.all([
    fetchActiveProjectsPage({ offset: 0, expireStale: true }),
    getAuthRole(),
  ]);

  return (
    <AllProjectsPageContent
      initialProjects={page.projects}
      initialTotal={page.total}
      initialHasMore={page.hasMore}
      initialNextOffset={page.nextOffset}
      role={role}
    />
  );
}
