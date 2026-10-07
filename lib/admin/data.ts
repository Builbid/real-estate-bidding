import { calculateSupervisorCommission, SUPERVISOR_PAYOUT_LABEL } from '@/lib/admin/constants';
import {
  currentMonthStartInstant,
  currentMonthStartIst,
  loadCompletedValues,
  monthLabel,
  pendingBalanceFor,
} from '@/lib/admin/settlement';
import { normalizePincodes } from '@/lib/admin/territory';
import { PROTOTYPE_RESET_AT } from '@/lib/admin/prototype';
import { formatBuilbidPublicId } from '@/lib/contract/mistriAgreement';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Profile, ProjectStatus, ServiceType } from '@/lib/types';

export type AdminTab =
  | 'projects'
  | 'workers'
  | 'clients'
  | 'agreements'
  | 'completed'
  | 'supervisors';

export interface CompletedWorkRow {
  projectId: string;
  publicId: string;
  projectName: string;
  location: string;
  /** Project pin code; used to scope the supervisor's own commission estimate. */
  pincode: string | null;
  clientName: string;
  finalBudget: number | null;
  supervisorPayout: number;
}

/**
 * Only non-sensitive summary data. Phone, Supervisor ID and Aadhaar are fetched on demand
 * when the profile modal opens, so they are never part of the page payload.
 */
export interface SupervisorAccount {
  name: string;
  /** Commission paid out to the supervisor in the current month. */
  totalReceived: number;
  /** e.g. "October 2026" */
  monthLabel: string;
  /** Sum of clamped supervisor earnings on unpaid completed works. Reduced by each issued payment slip. */
  pendingBalance: number;
  nextPaymentCycle: string;
  /** e.g. "0.2%" */
  commissionRate: string;
  /** Number of agreements this supervisor got approved (commission credited). */
  approvedAgreements: number;
  /** How many pin codes are assigned to this supervisor. */
  territoryCount: number;
}

export type AgreementState = 'none' | 'pending_esign' | 'partially_signed' | 'signed';

export interface ProjectWorkflowState {
  siteVisitDone: boolean;
  agreementState: AgreementState;
  /** Both parties signed via Aadhaar OTP and the PDFs were dispatched. */
  approved: boolean;
  /** When the agreement was fully signed and approved (null until then). */
  approvedAt: string | null;
}

export interface AdminKpis {
  liveAuctions: number;
  totalProjects: number;
  totalWorkers: number;
  totalClients: number;
  pendingApprovals: number;
  totalBids: number;
}

export type CallVerificationStatus = 'pending' | 'verified' | null;

/** Project status plus the admin hold introduced with migration 069. */
export type AdminProjectStatus = ProjectStatus | 'pending_call_verification';

export interface AdminProjectRow {
  id: string;
  /** Public project ID stored in projects.numeric_id (4 letters + 4 digits). */
  publicId: string;
  title: string;
  district: string;
  state: string;
  status: AdminProjectStatus;
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
  createdAt: string;
  workflow: ProjectWorkflowState;
  callVerificationStatus: CallVerificationStatus;
  ownerCallbackPhone: string | null;
}

/** Row shape returned by the projects select, including migration 069 columns. */
interface DashboardProjectRecord {
  id: string;
  numeric_id: string | null;
  title: string;
  district: string;
  state: string;
  pincode: string | null;
  status: AdminProjectStatus;
  bidding_ends_at: string;
  selection_ends_at: string | null;
  owner_id: string;
  selected_builder_id: string | null;
  service_type: string | null;
  budget_range_min: number | null;
  budget_range_max: number | null;
  created_at: string;
  updated_at: string;
  call_verification_status?: CallVerificationStatus;
  owner_callback_phone?: string | null;
}

type ProjectQueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

function readDashboardProjects(data: unknown): DashboardProjectRecord[] {
  const rows = Array.isArray(data) ? data : [];
  return rows as unknown as DashboardProjectRecord[];
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
  publicId: string;
  projectTitle: string;
  clientName: string;
  mistriName: string;
  rateSummary: string;
  executionDate: string;
  district: string;
  workflow: ProjectWorkflowState;
  /**
   * Prototype auto-conversion: the project was closed but no bidder has been formally awarded
   * yet. The lowest bidder is shown as the provisional awardee until the supervisor taps
   * "Receive / Accept Project".
   */
  provisional: boolean;
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

export function estimateSupervisorPayout(finalBudget: number | null): number {
  return calculateSupervisorCommission(finalBudget);
}

const NO_WORKFLOW: ProjectWorkflowState = {
  siteVisitDone: false,
  agreementState: 'none',
  approved: false,
  approvedAt: null,
};

/**
 * Site-visit / agreement / approval state per project. Tolerant of an un-migrated
 * database (returns an empty map) so the dashboard keeps working.
 */
async function loadWorkflowStates(): Promise<Map<string, ProjectWorkflowState>> {
  const map = new Map<string, ProjectWorkflowState>();
  try {
    const admin = createAdminClient();
    const [visits, contractsWithApproval] = await Promise.all([
      admin.from('project_site_visits').select('project_id').limit(5000),
      admin
        .from('project_digital_contracts')
        .select('project_id, status, approved_at')
        .limit(5000),
    ]);
    // Before migration 058 the approved_at column does not exist: fall back to status only.
    const contracts = contractsWithApproval.error
      ? await admin.from('project_digital_contracts').select('project_id, status').limit(5000)
      : contractsWithApproval;
    for (const row of (visits.data ?? []) as Array<{ project_id: string }>) {
      map.set(row.project_id, { ...NO_WORKFLOW, siteVisitDone: true });
    }
    for (const row of (contracts.data ?? []) as Array<{
      project_id: string;
      status: AgreementState;
      approved_at?: string | null;
    }>) {
      const prev = map.get(row.project_id) ?? NO_WORKFLOW;
      map.set(row.project_id, {
        ...prev,
        agreementState: row.status,
        approved: Boolean(row.approved_at),
        approvedAt: row.approved_at ?? null,
      });
    }
  } catch {
    // Service role key missing or tables not migrated yet.
  }
  return map;
}

export function formatSupervisorAdminId(userId: string): string {
  const hex = userId.replace(/-/g, '').toUpperCase();
  if (/^[0-9A-F]{8,}$/.test(hex)) return `SUP-${hex.slice(0, 8)}`;
  return formatBuilbidPublicId(userId).replace(/^BB-/, 'SUP-');
}

export async function loadAdminDashboardData(
  options: {
    /**
     * Supervisor territory. When set, ONLY projects whose pincode is in this list are loaded
     * (an empty list therefore loads nothing). Leave undefined for the official admin.
     */
    territory?: string[] | null;
    /**
     * Supervisor portal prototype view: Projects shows only live / running work, and
     * Agreements / Completed Works start from zero (legacy records before
     * PROTOTYPE_RESET_AT are hidden). The official admin keeps the full history.
     */
    supervisorView?: boolean;
  } = {},
): Promise<{
  kpis: AdminKpis;
  projects: AdminProjectRow[];
  workers: AdminWorkerRow[];
  clients: AdminClientRow[];
  agreements: AdminAgreementRow[];
  completedWorks: CompletedWorkRow[];
  pendingCallProjects: AdminProjectRow[];
}> {
  const supabase = await createClient();
  const territory = options.territory ?? null;
  const nowMs = Date.now();

  const baseProjectColumns =
    'id, numeric_id, title, district, state, pincode, status, bidding_ends_at, selection_ends_at, owner_id, selected_builder_id, service_type, budget_range_min, budget_range_max, created_at, updated_at';
  const callProjectColumns = `${baseProjectColumns}, call_verification_status, owner_callback_phone`;

  async function fetchProjects(columns: string): Promise<ProjectQueryResult> {
    const base = supabase.from('projects').select(columns);
    const scoped = territory
      ? base.in('pincode', territory.length > 0 ? territory : ['000000'])
      : base;
    const result = await scoped.order('created_at', { ascending: false }).limit(400);
    return {
      data: Array.isArray(result.data) ? result.data : null,
      error: result.error,
    };
  }

  let projectsResult = await fetchProjects(callProjectColumns);
  if (
    projectsResult.error &&
    /call_verification_status|owner_callback_phone/i.test(projectsResult.error.message)
  ) {
    projectsResult = await fetchProjects(baseProjectColumns);
  }

  const [
    { data: profilesRaw },
    { count: totalBidsAll },
    { data: bidsRawAll },
  ] = await Promise.all([
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

  const workflowByProject = await loadWorkflowStates();

  const projectsRaw = projectsResult.data;
  const projects = readDashboardProjects(projectsRaw ?? []);

  const profiles = (profilesRaw ?? []) as Array<
    Profile & { is_admin?: boolean; physical_address?: string | null }
  >;

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const projectIds = new Set(projects.map((p) => p.id));
  const bids = ((bidsRawAll ?? []) as Array<{
    project_id: string;
    builder_id: string;
    total_sum_metric: number;
    is_withdrawn: boolean;
  }>).filter((b) => !territory || projectIds.has(b.project_id));
  const totalBids = territory ? bids.length : totalBidsAll;

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
      publicId: (p.numeric_id ?? '').trim().toUpperCase(),
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
      createdAt: p.created_at,
      workflow: workflowByProject.get(p.id) ?? NO_WORKFLOW,
      callVerificationStatus: p.call_verification_status ?? null,
      ownerCallbackPhone: p.owner_callback_phone ?? null,
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

  // When live bidding ends, the project leaves Projects and becomes an agreement.
  // The lowest bidder fills the Mistri column until a formal award is stored.
  const lowestBidByProject = new Map<string, { builder_id: string; total_sum_metric: number }>();
  for (const bid of bids) {
    const current = lowestBidByProject.get(bid.project_id);
    if (!current || Number(bid.total_sum_metric) < Number(current.total_sum_metric)) {
      lowestBidByProject.set(bid.project_id, bid);
    }
  }
  const biddingHasEnded = (p: (typeof projects)[number]) =>
    p.status === 'cancelled' ||
    p.status !== 'active_24h' ||
    new Date(p.bidding_ends_at).getTime() <= nowMs;
  const isApprovedActive = (projectId: string) =>
    Boolean(workflowByProject.get(projectId)?.approved);

  const awaitingCompanyCall = (projectId: string) =>
    projects.find((item) => item.id === projectId)?.call_verification_status === 'pending';

  const supervisorView = options.supervisorView ?? false;
  const resetMs = Date.parse(PROTOTYPE_RESET_AT);

  // Agreements: bidding has ended, and both parties have not yet finished Aadhaar eSign.
  // Supervisor view still hides auctions that ended before the prototype reset.
  const agreements: AdminAgreementRow[] = projects
    .filter((p) => {
      if (p.status === 'cancelled' || isApprovedActive(p.id) || !biddingHasEnded(p)) return false;
      if (awaitingCompanyCall(p.id)) return false;
      if (supervisorView && new Date(p.bidding_ends_at).getTime() < resetMs) return false;
      return true;
    })
    .map((p) => {
      const owner = profileById.get(p.owner_id);
      const provisional = !p.selected_builder_id;
      const awardeeId = p.selected_builder_id ?? lowestBidByProject.get(p.id)?.builder_id ?? null;
      const mistri = awardeeId ? profileById.get(awardeeId) : undefined;
      const win = bids.find((b) => b.project_id === p.id && b.builder_id === awardeeId);
      return {
        provisional,
        projectId: p.id,
        publicId: (p.numeric_id ?? '').trim().toUpperCase(),
        projectTitle: p.title,
        clientName: owner?.full_name ?? '—',
        mistriName: mistri?.company_name || mistri?.full_name || '—',
        rateSummary:
          win != null
            ? `₹${Number(win.total_sum_metric).toLocaleString('en-IN')}`
            : '—',
        executionDate: p.updated_at || p.created_at,
        district: p.district,
        workflow: workflowByProject.get(p.id) ?? NO_WORKFLOW,
      };
    });

  const pendingApprovals = workers.filter((w) => !w.isVerified).length;

  const agreedCostByProject = new Map<string, number>();
  try {
    const admin = createAdminClient();
    const projectIdList = projects.map((p) => p.id);
    if (projectIdList.length > 0) {
      const { data: contractRows } = await admin
        .from('project_digital_contracts')
        .select('project_id, total_agreed_cost')
        .in('project_id', projectIdList);
      for (const row of (contractRows ?? []) as Array<{
        project_id: string;
        total_agreed_cost: number | string | null;
      }>) {
        const value = Number(row.total_agreed_cost);
        if (Number.isFinite(value) && value > 0) agreedCostByProject.set(row.project_id, value);
      }
    }
  } catch {
    // Service role missing: completed works stay blank rather than showing a bid amount.
  }

  // Projects lists a row only while Live Bidding is still running.
  const visibleProjectRows = projectRows.filter(
    (p) =>
      p.callVerificationStatus !== 'pending' &&
      !isApprovedActive(p.id) &&
      p.status === 'active_24h' &&
      new Date(p.biddingEndsAt).getTime() > nowMs,
  );

  const pendingCallProjects = supervisorView
    ? []
    : projectRows.filter((p) => p.callVerificationStatus === 'pending');

  const kpis: AdminKpis = {
    liveAuctions: projects.filter((p) => p.status === 'active_24h').length,
    totalProjects: visibleProjectRows.length,
    totalWorkers: workers.length,
    totalClients: clients.length,
    pendingApprovals,
    totalBids: totalBids ?? 0,
  };

  // Approved / Active (both parties finished Aadhaar eSign) leaves Agreements
  // and is listed under Completed Works. Supervisor view still hides approvals
  // recorded before the prototype reset.
  const completedWorks: CompletedWorkRow[] = projects
    .filter((p) => {
      if (p.status === 'cancelled' || !isApprovedActive(p.id)) return false;
      if (awaitingCompanyCall(p.id)) return false;
      if (!supervisorView) return true;
      const approvedAt = workflowByProject.get(p.id)?.approvedAt;
      return approvedAt ? Date.parse(approvedAt) >= resetMs : false;
    })
    .map((p) => {
      const row = projectRows.find((item) => item.id === p.id);
      const finalBudget = agreedCostByProject.get(p.id) ?? null;
      return {
        projectId: p.id,
        publicId: row?.publicId ?? (p.numeric_id ?? '').trim().toUpperCase(),
        projectName: p.title,
        location: [p.district, p.state].filter(Boolean).join(', ') || '—',
        pincode: p.pincode,
        clientName: row?.clientName ?? '—',
        finalBudget,
        supervisorPayout: calculateSupervisorCommission(finalBudget),
      };
    });

  return { kpis, projects: visibleProjectRows, workers, clients, agreements, completedWorks, pendingCallProjects };
}

export interface AdminSupervisorRow {
  userId: string;
  name: string;
  email: string;
  phone: string;
  pincodes: string[];
  pendingBalance: number;
  paidThisMonth: number;
}

/** Official-admin view: every supervisor with territory and settlement state. */
export async function loadAdminSupervisors(): Promise<AdminSupervisorRow[]> {
  try {
    const admin = createAdminClient();
    const withTerritory = await admin
      .from('supervisors')
      .select('user_id, supervisor_name, email, phone, assigned_pincodes')
      .order('created_at', { ascending: false })
      .limit(500);
    const base = withTerritory.error
      ? await admin
          .from('supervisors')
          .select('user_id, supervisor_name, email, phone')
          .order('created_at', { ascending: false })
          .limit(500)
      : withTerritory;
    const supervisors = (base.data ?? []) as Array<{
      user_id: string;
      supervisor_name: string;
      email: string;
      phone: string;
      assigned_pincodes?: string[] | null;
    }>;
    if (supervisors.length === 0) return [];

    const completed = await loadCompletedValues(admin);
    const monthStart = currentMonthStartInstant();
    const { data: paidRows } = await admin
      .from('supervisor_commissions')
      .select('supervisor_id, amount, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', monthStart)
      .limit(5000);
    const paidBySupervisor = new Map<string, number>();
    for (const row of (paidRows ?? []) as Array<{ supervisor_id: string; amount: number | string }>) {
      paidBySupervisor.set(
        row.supervisor_id,
        (paidBySupervisor.get(row.supervisor_id) ?? 0) + (Number(row.amount) || 0),
      );
    }

    return await Promise.all(
      supervisors.map(async (s) => {
        const pincodes = normalizePincodes(s.assigned_pincodes ?? []);
        return {
          userId: s.user_id,
          name: s.supervisor_name,
          email: s.email,
          phone: s.phone,
          pincodes,
          pendingBalance: await pendingBalanceFor(admin, s.user_id, pincodes, completed),
          paidThisMonth: paidBySupervisor.get(s.user_id) ?? 0,
        };
      }),
    );
  } catch {
    return [];
  }
}

/** Supervisors are settled every 10 days: the 11th, the 21st, then the 1st of the next month. */
export function nextSupervisorSettlementLabel(now = new Date()): string {
  const ist = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [year, month, day] = ist.split('-').map(Number);
  let nextDay = 1;
  let nextMonth = month;
  let nextYear = year;
  if (day < 11) nextDay = 11;
  else if (day < 21) nextDay = 21;
  else {
    nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
  }
  const next = new Date(Date.UTC(nextYear, nextMonth - 1, nextDay));
  const formatted = next.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Settlements every 10 days · next on ${formatted}`;
}

export async function loadSupervisorAccount(
  userId: string,
  fallbackEmail: string,
  completedWorks: CompletedWorkRow[],
  territoryCount: number,
): Promise<SupervisorAccount> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  let supervisorName: string | null = null;
  try {
    const admin = createAdminClient();
    const { data: supervisor } = await admin
      .from('supervisors')
      .select('supervisor_name')
      .eq('user_id', userId)
      .maybeSingle();
    supervisorName = supervisor?.supervisor_name?.trim() || null;
  } catch {
    supervisorName = null;
  }

  // Paid projects, and projects credited to another supervisor, are left out of this balance.
  const monthStart = currentMonthStartInstant();
  let receivedThisMonth = 0;
  let approvedAgreements = 0;
  const excludedFromPending = new Set<string>();
  try {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from('supervisor_commissions')
      .select('project_id, supervisor_id, amount, status, paid_at')
      .limit(5000);
    for (const row of (rows ?? []) as Array<{
      project_id: string;
      supervisor_id: string;
      amount: number | string;
      status: string;
      paid_at?: string | null;
    }>) {
      if (row.supervisor_id !== userId) {
        excludedFromPending.add(row.project_id);
        continue;
      }
      approvedAgreements += 1;
      if (row.status === 'paid') {
        excludedFromPending.add(row.project_id);
        if (row.paid_at && row.paid_at >= monthStart) receivedThisMonth += Number(row.amount) || 0;
      }
    }
  } catch {
    // Tables not migrated yet: the unpaid completed-works earnings are the whole balance.
  }

  // Same clamped earning shown on each Completed Works row, for projects not yet paid.
  const pendingBalance = completedWorks.reduce((sum, row) => {
    if (excludedFromPending.has(row.projectId)) return sum;
    return sum + row.supervisorPayout;
  }, 0);

  return {
    name: supervisorName || profile?.full_name?.trim() || fallbackEmail.split('@')[0] || 'Supervisor',
    totalReceived: receivedThisMonth,
    monthLabel: monthLabel(currentMonthStartIst()),
    pendingBalance,
    nextPaymentCycle: nextSupervisorSettlementLabel(),
    commissionRate: SUPERVISOR_PAYOUT_LABEL,
    approvedAgreements,
    territoryCount,
  };
}

