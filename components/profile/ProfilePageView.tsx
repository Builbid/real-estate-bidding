'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Folder,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Building,
  Award,
  CalendarDays,
  Settings,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { BuilderRatingBreakdown } from '@/components/shared/BuilderRatingBreakdown';
import { SignOutConfirmDialog } from '@/components/shared/SignOutConfirmDialog';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { normalizeRole, getDashboardPath } from '@/lib/auth/roles';
import { getProfileRoleLabel } from '@/lib/auth/profileRoleLabel';
import { clientSignOut } from '@/lib/auth/clientSignOut';
import { useDashboardProfile } from '@/lib/context/ProfileProvider';
import { InlineAccountDetails } from '@/components/profile/InlineAccountDetails';
import { EMPTY_RATING_STATS, type BuilderRatingStats } from '@/lib/builderRatings';
import type { Profile } from '@/lib/types';

export interface ProfileActivityMetrics {
  totalBids: number;
  activeBids: number;
  totalProjects: number;
  liveProjects: number;
  contractsWon: number;
  ratingStats: BuilderRatingStats;
  memberSince: string;
}

interface ProfilePageViewProps {
  profile: Profile;
  metrics: ProfileActivityMetrics;
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function ProfilePageView({ profile, metrics }: ProfilePageViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearProfile } = useDashboardProfile();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const normalizedRole = normalizeRole(profile.role);
  const isFirm = normalizedRole === 'construction_firm';
  const roleLabel = getProfileRoleLabel(profile, t);
  const dashboardPath = getDashboardPath(normalizedRole);
  const displayName = isFirm ? (profile.company_name ?? profile.full_name) : profile.full_name;
  const showBidMetrics = normalizedRole === 'labour_contractor' || normalizedRole === 'service_provider';
  const showProjectMetrics = normalizedRole === 'owner';
  const ratingStats = metrics.ratingStats ?? EMPTY_RATING_STATS;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link href={dashboardPath}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Header */}
      <section>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isFirm ? (
              <FirmLogo
                companyName={displayName}
                logoUrl={profile.logo_url}
                size="lg"
                className="h-12 w-12"
              />
            ) : (
              <User className="h-8 w-8 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{roleLabel}</span>
                {profile.is_verified && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Member since {metrics.memberSince}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            {normalizedRole === 'construction_firm' && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link href="/dashboard/firm/settings">
                  <Settings className="h-4 w-4" />
                  Firm Settings
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => setSignOutOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              {t('common.signOut')}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-base font-semibold text-foreground">Account Details</h2>
          <InlineAccountDetails
            profile={profile}
            roleLabel={roleLabel}
            gstNumber={isFirm ? profile.gst_number : null}
          />
        </section>

        <div className="space-y-8">
          <Link
            href="/dashboard/profile/documents"
            className="inline-flex items-center gap-2 text-base font-semibold text-foreground hover:text-sky-700 dark:hover:text-sky-400"
          >
            <Folder className="h-5 w-5 shrink-0 text-muted-foreground" />
            Documents
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <section>
            <h2 className="mb-4 text-base font-semibold text-foreground">Activity & Metrics</h2>
          <div className="space-y-4">
            {showBidMetrics && (
              <div className="grid grid-cols-2 gap-6">
                <MetricTile label="Total Bids" value={metrics.totalBids} icon={TrendingUp} />
                <MetricTile label="Active Bids" value={metrics.activeBids} icon={Award} />
                <MetricTile label="Contracts Won" value={metrics.contractsWon} icon={Building} />
              </div>
            )}

            {showProjectMetrics && (
              <div className="grid grid-cols-2 gap-6">
                <MetricTile label="Total Projects" value={metrics.totalProjects} icon={Building} />
                <MetricTile label="Live Projects" value={metrics.liveProjects} icon={TrendingUp} />
              </div>
            )}

            {normalizedRole === 'construction_firm' && (
              <div className="grid grid-cols-2 gap-6">
                <MetricTile label="Total Bids" value={metrics.totalBids} icon={TrendingUp} />
                <MetricTile label="Active Bids" value={metrics.activeBids} icon={Award} />
              </div>
            )}

            {showBidMetrics && (
              <div className="pt-2">
                <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Rating Breakdown
                </p>
                <BuilderRatingBreakdown stats={ratingStats} />
              </div>
            )}

            {normalizedRole === 'admin' && (
              <p className="text-sm text-muted-foreground">
                Platform administrator account — manage projects and users from the control center.
              </p>
            )}
          </div>
          </section>
        </div>
      </div>

      <SignOutConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={() => clientSignOut(router, { onClear: clearProfile })}
      />
    </div>
  );
}
