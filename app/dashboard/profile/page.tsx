export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { ProfilePageView, type ProfileActivityMetrics } from '@/components/profile/ProfilePageView';
import { normalizeRole } from '@/lib/auth/roles';
import type { Profile, UserRole } from '@/lib/types';
import { EMPTY_RATING_STATS, type BuilderRatingStats } from '@/lib/builderRatings';

const ROLE_AVATAR: Record<UserRole, string> = {
  owner: 'from-amber-400 to-orange-500',
  labour_contractor: 'from-blue-400 to-cyan-500',
  construction_firm: 'from-violet-400 to-indigo-600',
  admin: 'from-violet-400 to-indigo-600',
  service_provider: 'from-emerald-400 to-teal-500',
};

async function getProfileMetrics(
  supabase: Awaited<ReturnType<typeof getAuthUser>>['supabase'],
  userId: string,
  role: UserRole,
): Promise<ProfileActivityMetrics> {
  const memberSince = new Date().toISOString();

  let totalBids = 0;
  let activeBids = 0;
  let totalProjects = 0;
  let liveProjects = 0;
  let contractsWon = 0;
  let ratingStats: BuilderRatingStats = EMPTY_RATING_STATS;

  if (role === 'owner') {
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);

    const { count: liveCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .in('status', ['active_24h', 'frozen_24h']);

    totalProjects = projectCount ?? 0;
    liveProjects = liveCount ?? 0;
  } else {
    const { data: bids } = await supabase
      .from('bids')
      .select('id, is_withdrawn, project_id')
      .eq('builder_id', userId);

    totalBids = bids?.length ?? 0;
    activeBids = bids?.filter((b) => !b.is_withdrawn).length ?? 0;

    if (role === 'labour_contractor' || role === 'service_provider') {
      const { count: wonCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('selected_builder_id', userId);

      contractsWon = wonCount ?? 0;

      const { data: statsData } = await supabase.rpc('get_builder_rating_stats', {
        p_builder_id: userId,
      });

      if (statsData && typeof statsData === 'object') {
        ratingStats = statsData as BuilderRatingStats;
      }
    }
  }

  return {
    totalBids,
    activeBids,
    totalProjects,
    liveProjects,
    contractsWon,
    ratingStats,
    memberSince: new Date(memberSince).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
    }),
  };
}

export default async function DashboardProfilePage() {
  const { supabase, userId, email, role, fullName } = await getAuthUser();

  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  const profile: Profile = dbProfile
    ? { ...(dbProfile as Profile), role: normalizeRole((dbProfile as Profile).role) }
    : {
        id: userId,
        email,
        full_name: fullName || 'User',
        role: normalizeRole(role),
        mobile: null,
        physical_address: null,
        pincode: null,
        avatar_url: null,
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  const normalizedRole = normalizeRole(profile.role);
  const avatarGradient = ROLE_AVATAR[normalizedRole] ?? ROLE_AVATAR.labour_contractor;
  const metrics = await getProfileMetrics(supabase, userId, normalizedRole);

  metrics.memberSince = new Date(profile.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <ProfilePageView
      profile={profile}
      avatarGradient={avatarGradient}
      metrics={metrics}
    />
  );
}
