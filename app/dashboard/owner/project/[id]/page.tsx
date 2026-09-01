export const dynamic = 'force-dynamic';

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_ICON_BUTTON } from '@/lib/navStyles';
import { cn } from '@/lib/utils';
import { TRACK_LABELS } from '@/lib/utils';
import { ConstructionMatrixSummary } from '@/components/construction/ConstructionMatrixSummary';
import { OwnerProjectPhaseProvider } from '@/lib/context/OwnerProjectPhaseContext';
import { OwnerProjectPhaseBadge, OwnerProjectPhaseBody } from './OwnerProjectPhaseSection';
import type { Project, Bid, PublicFirmProfile } from '@/lib/types';
import { UnifiedBidRankings } from './UnifiedBidRankings';
import { UnifiedFirmBidRankings } from './UnifiedFirmBidRankings';
import { isFirmProject } from '@/lib/project/display';
import { isMistriCivilService, buildMistriAgreementPayload } from '@/lib/contract/mistriAgreement';
import { AgreementForm } from '@/components/contract/AgreementForm';

interface BuilderInfo {
  id: string;
  full_name: string;
  is_verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getData(id: string) {
  const { supabase, userId, fullName } = await getAuthUser();

  await supabase.rpc('expire_active_projects');

  const { data: rawProject } = await supabase.from('projects').select('*').eq('id', id).single();
  if (!rawProject) notFound();
  if (rawProject.owner_id !== userId) redirect('/dashboard/owner');

  const now = new Date();
  let project = rawProject as Project;

  // Inline transition for this project — reliable even if bulk RPC lags
  if (project.status === 'active_24h' && new Date(project.bidding_ends_at) <= now) {
    await supabase
      .from('projects')
      .update({
        status: 'frozen_24h',
        selection_ends_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .eq('id', id)
      .eq('status', 'active_24h');

    const { data: refreshed } = await supabase.from('projects').select('*').eq('id', id).single();
    if (refreshed) project = refreshed as Project;
  }

  if (
    project.status === 'frozen_24h' &&
    project.selection_ends_at &&
    new Date(project.selection_ends_at) <= now &&
    !project.selected_builder_id
  ) {
    await supabase.from('projects').update({ status: 'cancelled' }).eq('id', id);
    const { data: refreshed } = await supabase.from('projects').select('*').eq('id', id).single();
    if (refreshed) project = refreshed as Project;
  }

  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('project_id', id)
    .eq('is_withdrawn', false)
    .order('total_sum_metric', { ascending: true });

  // Builder/firm names are public; contact details stay in raw profiles only.
  let builders: Record<string, BuilderInfo> = {};
  let firms: Record<string, PublicFirmProfile> = {};

  if (bids && bids.length > 0) {
    const bidderIds = [
      ...new Set(bids.map((b: Bid) => b.builder_id).filter(Boolean)),
    ] as string[];

    if (isFirmProject(project as Project)) {
      const { data: firmData } = await supabase
        .from('firms_public')
        .select('*')
        .in('id', bidderIds);

      if (firmData) {
        firms = Object.fromEntries(
          (firmData as PublicFirmProfile[]).map((f) => [f.id, f]),
        );
      }
    } else {
      const { data: profileData } = await supabase
        .from('profiles_public')
        .select('id, full_name, is_verified, avatar_url, created_at')
        .in('id', bidderIds);

      if (profileData) {
        builders = Object.fromEntries(
          (profileData as BuilderInfo[]).map((p) => [p.id, p]),
        );
      }
    }
  }

  return { project, bids: (bids ?? []) as Bid[], builders, firms, userId, ownerName: fullName };
}

export default async function OwnerProjectPage({ params }: PageProps) {
  const { id } = await params;
  const { project, bids, builders, firms, userId, ownerName } = await getData(id);
  const isFirm = isFirmProject(project);
  const isMistri = isMistriCivilService(project.service_type);

  const configSummary = (
    <ConstructionMatrixSummary
      trackType={project.track_type}
      subConfiguration={project.sub_configuration}
      className="inline-flex flex-col gap-0.5"
    />
  );

  const selectedBuilder = project.selected_builder_id
    ? builders[project.selected_builder_id]
    : null;
  const selectedFirm = project.selected_builder_id
    ? firms[project.selected_builder_id]
    : null;

  const winningBid = project.selected_builder_id
    ? bids.find((bid) => bid.builder_id === project.selected_builder_id) ?? null
    : null;

  const mistriAgreement =
    isMistri && project.selected_builder_id
      ? buildMistriAgreementPayload({
          project,
          bid: winningBid,
          owner: { name: ownerName || 'Client' },
          mistri: {
            name: selectedBuilder?.full_name ?? 'Head Mason',
            platformId: project.selected_builder_id,
          },
        })
      : null;

  return (
    <OwnerProjectPhaseProvider initialProject={project}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ── Page header ────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <NavLink
            href="/dashboard/owner"
            prefetch
            className={cn(NAV_ICON_BUTTON, 'p-1 text-muted-foreground hover:text-foreground')}
          >
            <ArrowLeft className="w-5 h-5" />
          </NavLink>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{project.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {project.district} · {TRACK_LABELS[project.track_type]}
            </p>
            <div className="mt-2">{configSummary}</div>
          </div>
          <OwnerProjectPhaseBadge isFirm={isFirm} />
        </div>

        <OwnerProjectPhaseBody
          isFirm={isFirm}
          selectedBuilder={selectedBuilder}
          selectedFirm={selectedFirm}
        />

        {mistriAgreement && (
          <AgreementForm
            projectId={project.id}
            projectTitle={project.title}
            clientName={mistriAgreement.client.name}
            mistriName={mistriAgreement.mistri.companyName || mistriAgreement.mistri.name}
            siteAddress={mistriAgreement.siteAddress}
            acceptedRateLabel={mistriAgreement.acceptedRateLabel}
            totalValueLabel={mistriAgreement.totalLaborLabel}
            isRccStructural={mistriAgreement.isRccStructural}
            scopePreview={mistriAgreement.scopeRows}
            payoutSchedule={mistriAgreement.payoutSchedule}
            agreedStartDate={mistriAgreement.agreedStartDate}
          />
        )}

        {/* ── Unified bid rankings ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                Bid Rankings
                <span className="ml-2 text-sm font-normal text-muted-foreground">({bids.length})</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFirm ? (
              <UnifiedFirmBidRankings
                initialBids={bids}
                initialFirms={firms}
              />
            ) : (
              <UnifiedBidRankings
                initialBids={bids}
                initialBuilders={builders}
                userId={userId}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerProjectPhaseProvider>
  );
}
