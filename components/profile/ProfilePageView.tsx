'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  LogOut,
  Mail,
  Phone,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  TrendingUp,
  Building,
  Award,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { BuilderRatingBreakdown } from '@/components/shared/BuilderRatingBreakdown';
import { SignOutConfirmDialog } from '@/components/shared/SignOutConfirmDialog';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { normalizeRole, getDashboardPath } from '@/lib/auth/roles';
import { getProfileRoleLabel } from '@/lib/auth/profileRoleLabel';
import { clientSignOut } from '@/lib/auth/clientSignOut';
import { useDashboardProfile } from '@/lib/context/ProfileProvider';
import { EMPTY_RATING_STATS, type BuilderRatingStats } from '@/lib/builderRatings';
import type { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

const ROLE_BADGES: Record<string, 'amber' | 'teal' | 'indigo' | 'violet' | 'emerald'> = {
  owner: 'amber',
  labour_contractor: 'teal',
  construction_firm: 'violet',
  admin: 'indigo',
  service_provider: 'emerald',
};

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
  avatarGradient: string;
  metrics: ProfileActivityMetrics;
}

function MetricTile({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'emerald' | 'indigo' | 'amber' | 'teal';
}) {
  const colors = {
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    indigo: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    teal: 'border-teal-500/20 bg-teal-500/5 text-teal-600 dark:text-teal-400',
  };

  return (
    <div className={cn('rounded-xl border p-4', colors[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

export function ProfilePageView({ profile, avatarGradient, metrics }: ProfilePageViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearProfile } = useDashboardProfile();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const normalizedRole = normalizeRole(profile.role);
  const isFirm = normalizedRole === 'construction_firm';
  const badgeColor = ROLE_BADGES[normalizedRole] ?? 'teal';
  const roleLabel = getProfileRoleLabel(profile, t);
  const dashboardPath = getDashboardPath(normalizedRole);
  const displayName = isFirm ? (profile.company_name ?? profile.full_name) : profile.full_name;
  const showBidMetrics = normalizedRole === 'labour_contractor' || normalizedRole === 'service_provider';
  const showProjectMetrics = normalizedRole === 'owner';
  const ratingStats = metrics.ratingStats ?? EMPTY_RATING_STATS;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link href={dashboardPath}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden border-border bg-card/80 dark:bg-card/60">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              {isFirm ? (
                <FirmLogo
                  companyName={displayName}
                  logoUrl={profile.logo_url}
                  size="lg"
                  className="h-20 w-20 shadow-lg ring-2 ring-border/80"
                />
              ) : (
                <UserAvatar
                  name={profile.full_name}
                  size="xl"
                  gradient={avatarGradient}
                  className="shadow-lg"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={badgeColor}>{roleLabel}</Badge>
                  {profile.is_verified && (
                    <Badge variant="emerald" className="gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground inline-flex items-center gap-1.5">
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
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account details */}
        <Card className="border-border bg-card/80 dark:bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow icon={Mail} label="Email" value={profile.email} />
            <DetailRow icon={Phone} label="Mobile" value={profile.mobile ?? 'Not provided'} />
            <DetailRow
              icon={MapPin}
              label="Location"
              value={
                profile.physical_address
                  ? `${profile.physical_address}${profile.pincode ? ` — ${profile.pincode}` : ''}`
                  : 'Not provided'
              }
            />
            <DetailRow icon={BadgeCheck} label="Account Type" value={roleLabel} />
            {isFirm && profile.gst_number && (
              <DetailRow icon={ShieldCheck} label="GST Number" value={profile.gst_number} />
            )}
          </CardContent>
        </Card>

        {/* Activity & metrics */}
        <Card className="border-border bg-card/80 dark:bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity & Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showBidMetrics && (
              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="Total Bids" value={metrics.totalBids} icon={TrendingUp} color="indigo" />
                <MetricTile label="Active Bids" value={metrics.activeBids} icon={Award} color="emerald" />
                <MetricTile label="Contracts Won" value={metrics.contractsWon} icon={Building} color="amber" />
              </div>
            )}

            {showProjectMetrics && (
              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="Total Projects" value={metrics.totalProjects} icon={Building} color="indigo" />
                <MetricTile label="Live Projects" value={metrics.liveProjects} icon={TrendingUp} color="emerald" />
              </div>
            )}

            {normalizedRole === 'construction_firm' && (
              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="Total Bids" value={metrics.totalBids} icon={TrendingUp} color="indigo" />
                <MetricTile label="Active Bids" value={metrics.activeBids} icon={Award} color="emerald" />
              </div>
            )}

            {showBidMetrics && (
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
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
          </CardContent>
        </Card>
      </div>

      <SignOutConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        onConfirm={() => clientSignOut(router, { onClear: clearProfile })}
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3 dark:bg-muted/10">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}
