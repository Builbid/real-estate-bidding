import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building, MapPin, Layers, Calendar,
  Info, Lock, AlertTriangle
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { CountdownTicker } from '@/components/shared/CountdownTicker';
import { BidLeaderboard } from '@/components/shared/BidLeaderboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_CONFIG, TRACK_LABELS } from '@/lib/utils';
import { BuildingConfigSummary } from '@/components/construction/BuildingConfigSummary';
import {
  getProjectServiceType,
  getServiceBidderLabels,
  getServiceCategoryLabel,
  isFirmProject,
} from '@/lib/project/display';
import { getDashboardPath, normalizeRole } from '@/lib/auth/roles';
import { getProviderSpecialtyLabel } from '@/lib/trades';
import {
  getPainterWorkRequirementBlocks,
  parsePainterDetails,
} from '@/lib/painterDetails';
import {
  getMistriWorkRequirementBlocks,
  parseMistriDetails,
} from '@/lib/mistriDetails';
import type { Project, ServiceType, UserRole } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

type Viewer =
  | { kind: 'guest' }
  | { kind: 'owner'; userId: string }
  | {
      kind: 'bidder';
      userId: string;
      role: UserRole;
      serviceType: ServiceType | null;
      canBid: boolean;
    };

async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('*').eq('id', id).single();
  return data as Project | null;
}

async function getBidCount(projectId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from('bids').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
  return count ?? 0;
}

async function getViewer(project: Project): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: 'guest' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, service_type')
    .eq('id', user.id)
    .maybeSingle();

  const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
  const serviceType = (profile?.service_type as ServiceType | null) ?? null;
  const projectService = getProjectServiceType(project);

  if (role === 'owner') {
    return { kind: 'owner', userId: user.id };
  }

  if (role === 'labour_contractor') {
    return {
      kind: 'bidder',
      userId: user.id,
      role,
      serviceType: 'labour_contractor',
      canBid: projectService === 'labour_contractor',
    };
  }

  if (role === 'construction_firm') {
    return {
      kind: 'bidder',
      userId: user.id,
      role,
      serviceType: 'construction_firm',
      canBid: projectService === 'construction_firm',
    };
  }

  if (role === 'service_provider') {
    return {
      kind: 'bidder',
      userId: user.id,
      role,
      serviceType,
      canBid: !!serviceType && serviceType === projectService,
    };
  }

  return { kind: 'guest' };
}

function ActiveBidCta({
  viewer,
  projectId,
  bidder,
  serviceLabel,
}: {
  viewer: Viewer;
  projectId: string;
  bidder: ReturnType<typeof getServiceBidderLabels>;
  serviceLabel: string;
}) {
  if (viewer.kind === 'owner') {
    return (
      <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
        <p className="text-sm font-semibold text-foreground mb-2">This is a live auction</p>
        <p className="text-xs text-muted-foreground mb-4">
          Open your dashboard to track bids on your projects.
        </p>
        <Button size="sm" asChild>
          <Link href="/dashboard/owner">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (viewer.kind === 'bidder' && viewer.canBid) {
    const bidHref =
      viewer.role === 'construction_firm'
        ? `/dashboard/firm/bid/${projectId}`
        : `/dashboard/builder/bid/${projectId}`;
    return (
      <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
        <p className="text-sm font-semibold text-foreground mb-2">
          You can bid on this {serviceLabel} project
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Submit or update your competitive rate as a registered {bidder.singular}.
        </p>
        <Button size="sm" asChild>
          <Link href={bidHref}>Place Bid</Link>
        </Button>
      </div>
    );
  }

  if (viewer.kind === 'bidder' && !viewer.canBid) {
    const yourLabel =
      viewer.role === 'service_provider' && viewer.serviceType
        ? getProviderSpecialtyLabel(viewer.serviceType)
        : viewer.role === 'labour_contractor'
          ? 'Mistri Contractor'
          : viewer.role === 'construction_firm'
            ? 'Construction Firm'
            : 'bidder';
    return (
      <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
        <p className="text-sm font-semibold text-foreground mb-2">
          This project is for {bidder.plural}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          You are signed in as {yourLabel}. Open your dashboard to find matching auctions.
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link href={getDashboardPath(viewer.role)}>Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
      <p className="text-sm font-semibold text-foreground mb-2">
        Are you a registered {bidder.singular}?
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Sign in to submit your competitive rate bid for this {serviceLabel.toLowerCase()} project.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" asChild>
          <Link href="/login?role=bidder">Sign In to Bid</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={bidder.registerHref}>Register as {bidder.singular}</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [bidCount, viewer] = await Promise.all([getBidCount(id), getViewer(project)]);

  const status    = STATUS_CONFIG[project.status];
  const isActive  = project.status === 'active_24h';
  const isFrozen  = project.status === 'frozen_24h';
  const serviceType = getProjectServiceType(project);
  const bidder = getServiceBidderLabels(serviceType);
  const serviceLabel = getServiceCategoryLabel(serviceType);
  const painterDetails =
    serviceType === 'painter' ? parsePainterDetails(project.painter_details) : null;
  const painterBlocks = painterDetails
    ? getPainterWorkRequirementBlocks(painterDetails)
    : null;
  const mistriDetails =
    serviceType === 'labour_contractor' ? parseMistriDetails(project.mistri_details) : null;
  const mistriBlocks = mistriDetails
    ? getMistriWorkRequirementBlocks(mistriDetails)
    : null;
  const requirementBlocks = painterBlocks ?? mistriBlocks;
  const requirementsTitle = painterBlocks
    ? 'Painter Work Requirements'
    : mistriBlocks
      ? 'Mistri Work Requirements'
      : 'Engineering Specifications';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Auctions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                    <Building className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={isActive ? 'emerald' : isFrozen ? 'indigo' : 'default'}>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        {status.label}
                      </Badge>
                      <Badge>{serviceLabel}</Badge>
                    </div>
                    <h1 className="text-xl font-bold text-foreground leading-snug mb-1">{project.title}</h1>
                    {project.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  {requirementsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requirementBlocks ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <SpecItem icon={MapPin} label="District" value={project.district} />
                    <SpecItem icon={MapPin} label="State" value={project.state} />
                    <SpecItem icon={Layers} label="Building Type" value={TRACK_LABELS[project.track_type]} />
                    {requirementBlocks.map((block) => (
                      <div
                        key={block.label}
                        className={
                          block.label === 'Additional Requirements' ||
                          block.label === 'Additional Notes' ||
                          block.label === 'Civil Work Type' ||
                          block.label === 'Current Construction Scope (This Bid)' ||
                          block.label === 'Foundation Engineering Load Capacity' ||
                          block.label === 'Current Construction' ||
                          block.label === 'Future Planned Capacity'
                            ? 'col-span-2 sm:col-span-3'
                            : undefined
                        }
                      >
                        <SpecItem icon={Layers} label={block.label} value={block.value} />
                      </div>
                    ))}
                    <SpecItem
                      icon={Calendar}
                      label="Posted On"
                      value={new Date(project.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    />
                    {project.description?.trim() && (
                      <div className="col-span-2 sm:col-span-3">
                        <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider mb-1">
                          Specific Details
                        </p>
                        <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                          {project.description.trim()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <SpecItem icon={MapPin} label="District" value={project.district} />
                    <SpecItem icon={MapPin} label="State" value={project.state} />
                    <SpecItem icon={Layers} label="Track" value={TRACK_LABELS[project.track_type]} />
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider mb-2">Building Types</p>
                      <BuildingConfigSummary
                        project={project}
                        compact
                        hideConstructionTypes={isFirmProject(project)}
                        className="mb-4"
                      />
                      {!isFirmProject(project) && (
                        <>
                          <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider mb-2">Construction Scope</p>
                          <BuildingConfigSummary project={project} className="space-y-3" />
                        </>
                      )}
                      {isFirmProject(project) && (
                        <BuildingConfigSummary
                          project={project}
                          hideConstructionTypes
                          className="space-y-3"
                        />
                      )}
                    </div>
                    {project.plot_area_sqft && (
                      <SpecItem icon={Layers} label="Plot Area" value={`${project.plot_area_sqft.toLocaleString()} sqft`} />
                    )}
                    <SpecItem icon={Layers} label="Total Floors" value={
                      project.total_floors === 1 ? 'Ground Only'
                      : project.total_floors === 2 ? 'G+1'
                      : 'G+2'
                    } />
                    <SpecItem icon={Calendar} label="Posted On" value={new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                  </div>
                )}
              </CardContent>
            </Card>

            {isActive && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300 mb-1">Active Bidding Phase</p>
                  <p className="text-xs text-amber-400/70">
                    Bidding is open. {bidder.singular} names and profile photos appear on the live leaderboard.
                    Contact details (phone, email, address) are never shown publicly.
                  </p>
                </div>
              </div>
            )}

            {isFrozen && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-indigo-300 mb-1">Bidding Closed — Selection Phase</p>
                  <p className="text-xs text-indigo-400/70 mb-3">
                    The bidding window has ended. If you are the client, sign in to view full {bidder.singular.toLowerCase()} profiles and select your {bidder.singular.toLowerCase()}.
                  </p>
                  <Button size="sm" variant="indigo" asChild>
                    <Link href="/login">Sign In to Select {bidder.singular}</Link>
                  </Button>
                </div>
              </div>
            )}

            {isActive && (
              <ActiveBidCta
                viewer={viewer}
                projectId={project.id}
                bidder={bidder}
                serviceLabel={serviceLabel}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {isActive && (
              <Card className="border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="text-sm text-emerald-400 uppercase tracking-wider">Bidding Closes In</CardTitle>
                </CardHeader>
                <CardContent>
                  <CountdownTicker targetDateISO={project.bidding_ends_at} />
                </CardContent>
              </Card>
            )}

            {isFrozen && project.selection_ends_at && (
              <Card className="border-indigo-500/20">
                <CardHeader>
                  <CardTitle className="text-sm text-indigo-400 uppercase tracking-wider">Selection Closes In</CardTitle>
                </CardHeader>
                <CardContent>
                  <CountdownTicker targetDateISO={project.selection_ends_at} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground mb-1">{bidCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {bidder.plural} have bid on this project
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bid Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <BidLeaderboard
                  projectId={project.id}
                  projectStatus={project.status}
                  trackType={project.track_type}
                  subConfiguration={project.sub_configuration}
                  serviceType={serviceType}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function SpecItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground/90 leading-snug">{value}</p>
      </div>
    </div>
  );
}
