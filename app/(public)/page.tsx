import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HomePageContent } from '@/components/home/HomePageContent';
import type { Project } from '@/lib/types';
import type { ShowcaseProject } from '@/lib/projectShowcase';
import { isProjectBiddingLive } from '@/lib/projectShowcase';
import { normalizeRole } from '@/lib/auth/roles';
import { getFeaturedPartners } from '@/lib/featured/getFeaturedPartners';

export const dynamic = 'force-dynamic';

type ProjectRow = Project & {
  owner: { id: string; full_name: string } | null;
  bids: [{ count: number }] | null;
};

async function getActiveShowcaseProjects(): Promise<ShowcaseProject[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase.rpc('expire_active_projects');

  const { data } = await supabase
    .from('projects')
    .select('*, owner:profiles_public!owner_id(id, full_name), bids(count)')
    .eq('status', 'active_24h')
    .gt('bidding_ends_at', now)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as ProjectRow[];
  if (rows.length === 0) return [];

  const projectIds = rows.map((row) => row.id);
  const { data: bidRows } = await supabase
    .from('bids')
    .select('project_id, total_sum_metric')
    .in('project_id', projectIds)
    .eq('is_withdrawn', false);

  const lowestByProject = new Map<string, number>();
  for (const bid of bidRows ?? []) {
    const current = lowestByProject.get(bid.project_id);
    if (current == null || bid.total_sum_metric < current) {
      lowestByProject.set(bid.project_id, bid.total_sum_metric);
    }
  }

  return rows.map((row) => ({
    ...row,
    owner: row.owner ?? undefined,
    bid_count: row.bids?.[0]?.count ?? 0,
    lowest_rate: lowestByProject.get(row.id) ?? null,
  }));
}

async function getFrozenProjects() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'frozen_24h')
    .order('created_at', { ascending: false })
    .limit(6);
  return (data ?? []) as Project[];
}

async function countLifetimeBidsSubmitted(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  // Lifetime total must survive hard-deletes (project cascade / admin wipe).
  // bid_submission_log is append-only; fall back to live bids if the table
  // is not migrated yet. Never filter withdrawn/deleted rows.
  const [{ count: liveCount, error: liveError }, logResult] = await Promise.all([
    admin.from('bids').select('*', { count: 'exact', head: true }),
    admin.from('bid_submission_log').select('*', { count: 'exact', head: true }),
  ]);

  const live = liveError ? 0 : (liveCount ?? 0);
  if (logResult.error) return live;
  return Math.max(logResult.count ?? 0, live);
}

async function getStats(activeShowcaseCount: number) {
  const supabase = await createClient();
  // Service role bypasses bids RLS, which otherwise only exposes rows on
  // currently active_24h auctions (so the homepage undercounted real bids).
  const admin = createAdminClient();

  const [
    { count: totalProjects },
    totalBids,
    { count: frozenProjects },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    countLifetimeBidsSubmitted(admin),
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'frozen_24h'),
  ]);

  return {
    totalProjects: totalProjects ?? 0,
    activeBids: totalBids,
    activeShowcaseCount,
    frozenProjects: frozenProjects ?? 0,
  };
}

async function getAuthStatus() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isAuthenticated: false, role: null };
    const { data: sp } = await supabase
      .from('service_providers')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    let role: ReturnType<typeof normalizeRole>;
    if (sp) {
      role = 'service_provider';
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      role = normalizeRole(profile?.role);
      if (!profile) {
        const meta = user.user_metadata as Record<string, unknown> | undefined;
        if (
          meta?.role === 'service_provider' ||
          meta?.hire_service_provider === true ||
          meta?.hire_service_provider === 'true'
        ) {
          role = 'service_provider';
        }
      }
    }
    return { isAuthenticated: true, role };
  } catch {
    return { isAuthenticated: false, role: null };
  }
}

export default async function HomePage() {
  // Real live auctions only — demo/fake showcase projects are not shown.
  const showcaseProjects = await getActiveShowcaseProjects();
  const [frozenProjects, stats, auth, featured] = await Promise.all([
    getFrozenProjects(),
    getStats(showcaseProjects.filter(isProjectBiddingLive).length),
    getAuthStatus(),
    getFeaturedPartners(),
  ]);
  const { isAuthenticated, role } = auth;

  const statValues: Record<string, number> = {
    active: stats.activeShowcaseCount,
    frozen: stats.frozenProjects,
    total: stats.totalProjects,
    bids: stats.activeBids,
  };

  return (
    <HomePageContent
      showcaseProjects={showcaseProjects}
      frozenProjects={frozenProjects}
      statValues={statValues}
      isAuthenticated={isAuthenticated}
      role={role}
      featuredFirms={featured.firms}
    />
  );
}
