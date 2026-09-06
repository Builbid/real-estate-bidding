import { createClient } from '@/lib/supabase/server';
import { formatBuilbidPublicId } from '@/lib/contract/mistriAgreement';
import type { Profile, ProjectStatus, ServiceType } from '@/lib/types';

export type AdminTab = 'overview' | 'projects' | 'workers' | 'clients' | 'agreements';

export interface AdminKpis {
  liveAuctions: number;
  totalProjects: number;
  totalWorkers: number;
  totalClients: number;
  pendingApprovals: number;
  totalBids: number;
}

export interface AdminProjectRow {
  id: string;
  title: string;
  district: string;
  state: string;
  status: ProjectStatus;
  biddingEndsAt: string;
  selectionEndsAt: string | null;
  clientName: string;
  clientId: string;
  bidCount: number;
  lowestBid: number | null;
  highestBid: number | null;
  winningBid: number | null;
  selectedBuilderId: string | null;
  serviceType: string | null;
}

export interface AdminWorkerRow {
  id: string;
  fullName: string;
  mobile: string | null;
  email: string;
  tradeType: string;
  builbidId: string;
  district: string | null;
  govtId: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface AdminClientRow {
  id: string;
  fullName: string;
  mobile: string | null;
  email: string;
  district: string | null;
  projectsPosted: number;
  contractsAwarded: number;
  createdAt: string;
}

export interface AdminAgreementRow {
  projectId: string;
  projectTitle: string;
  clientName: string;
  mistriName: string;
  rateSummary: string;
  executionDate: string;
  district: string;
}

function tradeLabel(role: string, serviceType: ServiceType | null | undefined): string {
  if (role === 'labour_contractor' || role === 'builder') return 'Mistri Worker';
  if (role === 'construction_firm') return 'Construction Firm';
  if (serviceType) {
    return serviceType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return role;
}

export async function loadAdminDashboardData(): Promise<{
  kpis: AdminKpis;
  projects: AdminProjectRow[];
  workers: AdminWorkerRow[];
  clients: AdminClientRow[];
  agreements: AdminAgreementRow[];
}> {
  const supabase = await createClient();

  const [
    { data: projectsRaw },
    { data: profilesRaw },
    { count: totalBids },
    { data: bidsRaw },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'id, title, district, state, status, bidding_ends_at, selection_ends_at, owner_id, selected_builder_id, service_type, created_at, updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(400),
    supabase
      .from('profiles')
      .select(
        'id, role, full_name, mobile, email, physical_address, pincode, gst_number, service_type, company_name, is_verified, is_admin, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(800),
    supabase.from('bids').select('*', { count: 'exact', head: true }).eq('is_withdrawn', false),
    supabase
      .from('bids')
      .select('project_id, builder_id, total_sum_metric, is_withdrawn')
      .eq('is_withdrawn', false)
      .limit(5000),
  ]);

  const projects = (projectsRaw ?? []) as Array<{
    id: string;
    title: string;
    district: string;
    state: string;
    status: ProjectStatus;
    bidding_ends_at: string;
    selection_ends_at: string | null;
    owner_id: string;
    selected_builder_id: string | null;
    service_type: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const profiles = (profilesRaw ?? []) as Array<
    Profile & { is_admin?: boolean; physical_address?: string | null }
  >;

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const bids = (bidsRaw ?? []) as Array<{
    project_id: string;
    builder_id: string;
    total_sum_metric: number;
    is_withdrawn: boolean;
  }>;

  const bidsByProject = new Map<string, number[]>();
  for (const bid of bids) {
    const list = bidsByProject.get(bid.project_id) ?? [];
    list.push(Number(bid.total_sum_metric) || 0);
    bidsByProject.set(bid.project_id, list);
  }

  const projectRows: AdminProjectRow[] = projects.map((p) => {
    const amounts = bidsByProject.get(p.id) ?? [];
    const owner = profileById.get(p.owner_id);
    let winningBid: number | null = null;
    if (p.selected_builder_id) {
      const win = bids.find(
        (b) => b.project_id === p.id && b.builder_id === p.selected_builder_id,
      );
      winningBid = win ? Number(win.total_sum_metric) : null;
    }
    return {
      id: p.id,
      title: p.title,
      district: p.district,
      state: p.state,
      status: p.status,
      biddingEndsAt: p.bidding_ends_at,
      selectionEndsAt: p.selection_ends_at,
      clientName: owner?.full_name ?? '—',
      clientId: p.owner_id,
      bidCount: amounts.length,
      lowestBid: amounts.length ? Math.min(...amounts) : null,
      highestBid: amounts.length ? Math.max(...amounts) : null,
      winningBid,
      selectedBuilderId: p.selected_builder_id,
      serviceType: p.service_type,
    };
  });

  const workerRoles = new Set([
    'labour_contractor',
    'construction_firm',
    'service_provider',
    'builder',
  ]);

  const workers: AdminWorkerRow[] = profiles
    .filter((p) => workerRoles.has(p.role) && !p.is_admin)
    .map((p) => ({
      id: p.id,
      fullName: p.company_name || p.full_name,
      mobile: p.mobile ?? null,
      email: p.email,
      tradeType: tradeLabel(p.role, p.service_type),
      builbidId: formatBuilbidPublicId(p.id),
      district: p.physical_address ?? p.pincode ?? null,
      govtId: p.gst_number ?? null,
      isVerified: !!p.is_verified,
      createdAt: p.created_at,
    }));

  const projectsByOwner = new Map<string, number>();
  const awardsByOwner = new Map<string, number>();
  for (const p of projects) {
    projectsByOwner.set(p.owner_id, (projectsByOwner.get(p.owner_id) ?? 0) + 1);
    if (p.selected_builder_id && p.status === 'completed') {
      awardsByOwner.set(p.owner_id, (awardsByOwner.get(p.owner_id) ?? 0) + 1);
    }
  }

  const clients: AdminClientRow[] = profiles
    .filter((p) => p.role === 'owner')
    .map((p) => ({
      id: p.id,
      fullName: p.full_name,
      mobile: p.mobile ?? null,
      email: p.email,
      district: p.physical_address ?? p.pincode ?? null,
      projectsPosted: projectsByOwner.get(p.id) ?? 0,
      contractsAwarded: awardsByOwner.get(p.id) ?? 0,
      createdAt: p.created_at,
    }));

  const agreements: AdminAgreementRow[] = projects
    .filter((p) => !!p.selected_builder_id)
    .map((p) => {
      const owner = profileById.get(p.owner_id);
      const mistri = p.selected_builder_id
        ? profileById.get(p.selected_builder_id)
        : undefined;
      const win = bids.find(
        (b) => b.project_id === p.id && b.builder_id === p.selected_builder_id,
      );
      return {
        projectId: p.id,
        projectTitle: p.title,
        clientName: owner?.full_name ?? '—',
        mistriName: mistri?.company_name || mistri?.full_name || '—',
        rateSummary:
          win != null
            ? `₹${Number(win.total_sum_metric).toLocaleString('en-IN')}`
            : '—',
        executionDate: p.updated_at || p.created_at,
        district: p.district,
      };
    });

  const pendingApprovals = workers.filter((w) => !w.isVerified).length;

  const kpis: AdminKpis = {
    liveAuctions: projects.filter((p) => p.status === 'active_24h').length,
    totalProjects: projects.length,
    totalWorkers: workers.length,
    totalClients: clients.length,
    pendingApprovals,
    totalBids: totalBids ?? 0,
  };

  return { kpis, projects: projectRows, workers, clients, agreements };
}
