export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/getUser';
import { getDashboardPath } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { soilLabel } from '@/lib/admin/siteVisit';
import { readLineItems } from '@/lib/admin/siteVisitStore';
import {
  DASHBOARD_COMPLETED_LIMIT,
  isAgreementComplete,
  isOwnerSelectedProject,
  ownerSelectedProjectStatus,
} from '@/lib/dashboard/completedProjects';
import {
  SelectedProjectCard,
  type SelectedProjectFacts,
  type SelectedWorkerProfile,
} from '@/components/dashboard/SelectedProjectCard';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { cn, sortByTimestampDesc } from '@/lib/utils';
import type { BidRates, Project } from '@/lib/types';

function selectedStamp(project: Project): string {
  return project.builder_selected_at || project.updated_at || project.created_at;
}

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function positive(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function agreedRateLines(rates: BidRates | null, singleRate: number | null): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];
  const floors: Array<[number | undefined, string]> = [
    [rates?.ground_rate, 'Ground floor'],
    [rates?.first_rate, '1st floor'],
    [rates?.second_rate, '2nd floor'],
    [rates?.third_rate, '3rd floor'],
  ];
  for (const [rate, label] of floors) {
    if (rate && rate > 0) lines.push({ label, value: `${money(rate)} / sq. ft.` });
  }
  if (singleRate && singleRate > 0) lines.push({ label: 'Agreed rate', value: money(singleRate) });
  return lines;
}

export default async function OwnerSelectedProjectsPage() {
  const { supabase, userId, role } = await getAuthUser();
  if (role !== 'owner') redirect(getDashboardPath(role));

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load selected projects: ${error.message}`);
  }

  const selected = sortByTimestampDesc(
    ((data ?? []) as Project[]).filter(
      (project) => project.status !== 'expired' && isOwnerSelectedProject(project),
    ),
    selectedStamp,
  );
  const visible = selected.slice(0, DASHBOARD_COMPLETED_LIMIT);
  const projectIds = visible.map((project) => project.id);
  const workerIds = [...new Set(visible.map((project) => project.selected_builder_id).filter(Boolean))] as string[];

  const visits = new Map<string, {
    lineItems: ReturnType<typeof readLineItems>;
    total: number | null;
    plinth: number | null;
    soil: string | null;
    start: string | null;
    completion: string | null;
  }>();
  const verifiedAgreements = new Set<string>();
  const contractTotals = new Map<string, number>();
  const bidTotals = new Map<string, { total: number | null; rates: BidRates | null; singleRate: number | null }>();

  if (projectIds.length > 0) {
    try {
      const admin = createAdminClient();
      const [visitResult, contractResult, bidResult] = await Promise.all([
        admin
          .from('project_site_visits')
          .select('project_id, line_items, total_accurate_cost, plinth_area_sqft, soil_type, agreed_start_date, target_completion_date')
          .in('project_id', projectIds),
        admin
          .from('project_digital_contracts')
          .select('project_id, total_agreed_cost, approved_at, status, client_verified_at, contractor_verified_at')
          .in('project_id', projectIds),
        admin
          .from('bids')
          .select('project_id, builder_id, total_sum_metric, rates, single_rate, is_withdrawn')
          .in('project_id', projectIds)
          .eq('is_withdrawn', false),
      ]);

      for (const row of (visitResult.data ?? []) as Array<Record<string, unknown>>) {
        const projectId = String(row.project_id ?? '');
        if (!projectId) continue;
        const soil = typeof row.soil_type === 'string' ? row.soil_type : '';
        visits.set(projectId, {
          lineItems: readLineItems(row.line_items),
          total: positive(row.total_accurate_cost),
          plinth: positive(row.plinth_area_sqft),
          soil: soil ? soilLabel(soil) : null,
          start: typeof row.agreed_start_date === 'string' ? row.agreed_start_date : null,
          completion: typeof row.target_completion_date === 'string' ? row.target_completion_date : null,
        });
      }

      for (const row of (contractResult.data ?? []) as Array<Record<string, unknown>>) {
        const projectId = String(row.project_id ?? '');
        if (!projectId) continue;
        const bothVerified = Boolean(row.client_verified_at && row.contractor_verified_at);
        const signed = String(row.status ?? '').toLowerCase() === 'signed' || Boolean(row.approved_at) || bothVerified;
        if (signed) verifiedAgreements.add(projectId);
        const total = positive(row.total_agreed_cost);
        if (total) contractTotals.set(projectId, total);
      }

      for (const row of (bidResult.data ?? []) as Array<Record<string, unknown>>) {
        const projectId = String(row.project_id ?? '');
        const builderId = typeof row.builder_id === 'string' ? row.builder_id : '';
        if (!projectId || !builderId) continue;
        bidTotals.set(`${projectId}:${builderId}`, {
          total: positive(row.total_sum_metric),
          rates: row.rates && typeof row.rates === 'object' ? (row.rates as BidRates) : null,
          singleRate: positive(row.single_rate),
        });
      }
    } catch {
      // Cards still render from the project itself when the service role is unavailable.
    }
  }

  const workers = new Map<string, SelectedWorkerProfile>();
  if (workerIds.length > 0) {
    const withCompany = await supabase
      .from('profiles_public')
      .select('id, full_name, company_name, is_verified')
      .in('id', workerIds);
    const profiles = withCompany.error
      ? await supabase.from('profiles_public').select('id, full_name, is_verified').in('id', workerIds)
      : withCompany;
    for (const row of (profiles.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      company_name?: string | null;
      is_verified?: boolean | null;
    }>) {
      workers.set(row.id, {
        id: row.id,
        name: row.company_name?.trim() || row.full_name?.trim() || 'Worker',
        isVerified: Boolean(row.is_verified),
      });
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <Link href="/dashboard/owner" className={cn(NAV_BACK_LINK, 'mb-3')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Selected Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {selected.length === 0
            ? 'Projects appear here as soon as you select a worker.'
            : selected.length > visible.length
              ? `Showing the ${visible.length} most recent of ${selected.length} selected projects.`
              : `${visible.length} selected project${visible.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((project) => {
            const visit = visits.get(project.id);
            const bid = project.selected_builder_id
              ? bidTotals.get(`${project.id}:${project.selected_builder_id}`)
              : undefined;
            const agreementVerified = isAgreementComplete(project) || verifiedAgreements.has(project.id);
            const facts: SelectedProjectFacts = {
              status: ownerSelectedProjectStatus(Boolean(visit), agreementVerified),
              plinthAreaSqft: visit?.plinth ?? positive(project.floor_area_sqft) ?? positive(project.plot_area_sqft),
              soilLabel: visit?.soil ?? null,
              startDate: visit?.start ?? null,
              completionDate: visit?.completion ?? null,
              totalCost: visit?.total ?? contractTotals.get(project.id) ?? bid?.total ?? null,
              lineItems: visit?.lineItems ?? [],
              agreedRates: visit?.lineItems.length ? [] : agreedRateLines(bid?.rates ?? null, bid?.singleRate ?? null),
            };
            return (
              <SelectedProjectCard
                key={project.id}
                project={project}
                worker={project.selected_builder_id ? workers.get(project.selected_builder_id) ?? null : null}
                facts={facts}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
