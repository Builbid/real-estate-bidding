'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { toast, Toaster } from 'sonner';
import {
  Building2,
  Clock,
  Download,
  FileText,
  HardHat,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Search,
  Shield,
  Users,
  Gavel,
  ExternalLink,
  TimerReset,
} from 'lucide-react';
import {
  adminCloseAuctionAction,
  adminExtendAuctionAction,
  adminSignOutAction,
  adminToggleWorkerVerificationAction,
} from '@/app/admin/actions';
import type {
  AdminAgreementRow,
  AdminClientRow,
  AdminKpis,
  AdminProjectRow,
  AdminTab,
  AdminWorkerRow,
} from '@/lib/admin/data';
import {
  ADMIN_STATUS_FILTERS,
  ADMIN_TRADE_FILTERS,
  matchesAdminStatusFilter,
  resolveAdminTradeBadge,
  tradeToneClass,
} from '@/lib/admin/tradeBadges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatRelativeTime, STATUS_CONFIG } from '@/lib/utils';

const TH =
  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500';
const TD = 'px-4 py-3.5 align-middle';
const TABLE_SHELL =
  'overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const ROW_HOVER =
  'border-b border-slate-100 transition duration-150 last:border-0 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40';

function formatMoney(value: number | null): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

function formatRate(
  value: number | null,
  serviceType: string | null,
): string {
  if (value == null) return '—';
  const money = formatMoney(value);
  const unitTypes = new Set([
    'labour_contractor',
    'construction_firm',
    'painter',
    'carpenter',
  ]);
  if (serviceType && unitTypes.has(serviceType)) {
    return `${money} / sq. ft.`;
  }
  return money;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function countdownLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${m}m left`;
}

function shortId(id: string): string {
  return `#${id.slice(0, 8)}`;
}

function TradeBadge({ serviceType }: { serviceType: string | null }) {
  const trade = resolveAdminTradeBadge(serviceType);
  const Icon = trade.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
        tradeToneClass(trade.tone),
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {trade.label}
    </span>
  );
}

function ProjectStatusCell({
  status,
  biddingEndsAt,
}: {
  status: AdminProjectRow['status'];
  biddingEndsAt: string;
}) {
  const isLive =
    status === 'active_24h' && new Date(biddingEndsAt).getTime() > Date.now();
  const isCancelled = status === 'cancelled';
  const isDone = status === 'completed';
  const label = STATUS_CONFIG[status]?.label ?? status;
  const remaining = countdownLabel(biddingEndsAt);

  if (isLive) {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live Bidding
        </span>
        <p className="text-xs font-medium text-slate-500">⏱ {remaining}</p>
      </div>
    );
  }

  if (isCancelled || remaining === 'Expired') {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
          {isCancelled ? 'Cancelled' : 'Expired'}
        </span>
        {!isCancelled ? (
          <p className="text-xs font-medium text-slate-500">{remaining}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
          isDone
            ? 'border-slate-200 bg-slate-100 text-slate-700'
            : 'border-indigo-200 bg-indigo-50 text-indigo-700',
        )}
      >
        {label}
      </span>
      {status === 'active_24h' || status === 'frozen_24h' ? (
        <p className="text-xs font-medium text-slate-500">⏱ {remaining}</p>
      ) : null}
    </div>
  );
}

function BidMetricsCell({ project }: { project: AdminProjectRow }) {
  if (project.bidCount === 0) {
    return <span className="text-sm text-slate-400">0 bids</span>;
  }

  const primary =
    project.winningBid != null ? project.winningBid : project.lowestBid;
  const primaryLabel =
    project.winningBid != null ? 'Winning rate' : 'Lowest rate';

  return (
    <div className="min-w-[140px] space-y-0.5">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {formatRate(primary, project.serviceType)}
      </p>
      <p className="text-[11px] text-slate-400">{primaryLabel}</p>
      {project.bidCount === 1 ? (
        <p className="text-xs text-slate-500">1 bid placed</p>
      ) : (
        <p className="text-xs text-slate-500">
          Range: {formatMoney(project.lowestBid)} –{' '}
          {formatMoney(project.highestBid)}
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  'aria-label': string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

const TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: Building2 },
  { id: 'workers', label: 'Mistris / Workers', icon: HardHat },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'agreements', label: 'Agreements', icon: FileText },
];

export function AdminDashboardClient({
  email,
  kpis,
  projects,
  workers,
  clients,
  agreements,
}: {
  email: string;
  kpis: AdminKpis;
  projects: AdminProjectRow[];
  workers: AdminWorkerRow[];
  clients: AdminClientRow[];
  agreements: AdminAgreementRow[];
}) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [query, setQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pending, startTransition] = useTransition();

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const trade = resolveAdminTradeBadge(p.serviceType);
      if (tradeFilter !== 'all' && trade.key !== tradeFilter) return false;
      if (!matchesAdminStatusFilter(p.status, statusFilter)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        trade.label.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [projects, query, tradeFilter, statusFilter]);

  const filteredWorkers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter(
      (w) =>
        w.fullName.toLowerCase().includes(q) ||
        w.tradeType.toLowerCase().includes(q) ||
        w.builbidId.toLowerCase().includes(q) ||
        (w.mobile ?? '').includes(q),
    );
  }, [workers, query]);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.mobile ?? '').includes(q),
    );
  }, [clients, query]);

  const filteredAgreements = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agreements;
    return agreements.filter(
      (a) =>
        a.projectTitle.toLowerCase().includes(q) ||
        a.clientName.toLowerCase().includes(q) ||
        a.mistriName.toLowerCase().includes(q),
    );
  }, [agreements, query]);

  function switchTab(next: AdminTab) {
    setTab(next);
    setQuery('');
    setTradeFilter('all');
    setStatusFilter('all');
  }

  function runAction(
    action: () => Promise<{ error?: string; ok?: boolean } | void>,
    successMessage = 'Updated successfully.',
  ) {
    startTransition(async () => {
      const result = await action();
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(successMessage);
      }
    });
  }

  return (
    <div className="flex min-h-screen">
      <Toaster position="top-right" richColors closeButton />

      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-4 py-5 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            BuilBid Official
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            Admin Portal
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const count =
              id === 'projects'
                ? projects.length
                : id === 'workers'
                  ? workers.length
                  : id === 'clients'
                    ? clients.length
                    : id === 'agreements'
                      ? agreements.length
                      : null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
                  tab === id
                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {count != null ? (
                  <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-600" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {email}
              </p>
              <Badge variant="emerald" className="mt-0.5 text-[10px]">
                Official admin session
              </Badge>
            </div>
          </div>
          <form action={adminSignOutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </form>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold',
                tab === id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="flex-1 space-y-5 p-4 sm:p-6">
          {tab !== 'overview' ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search this table…"
                  className="h-9 border-slate-200 bg-white pl-9 shadow-sm"
                />
              </div>
              {tab === 'projects' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect
                    aria-label="Filter by trade"
                    value={tradeFilter}
                    onChange={setTradeFilter}
                    options={ADMIN_TRADE_FILTERS}
                  />
                  <FilterSelect
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={ADMIN_STATUS_FILTERS}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'overview' ? (
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: 'Live auctions', value: kpis.liveAuctions, icon: Gavel },
                {
                  label: 'Projects posted',
                  value: kpis.totalProjects,
                  icon: Building2,
                },
                { label: 'Workers', value: kpis.totalWorkers, icon: HardHat },
                { label: 'Clients', value: kpis.totalClients, icon: Users },
                {
                  label: 'Pending verify',
                  value: kpis.pendingApprovals,
                  icon: Clock,
                },
                { label: 'Bids placed', value: kpis.totalBids, icon: FileText },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-2 text-slate-500">
                    <Icon className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">
                      {label}
                    </p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {value.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </section>
          ) : null}

          {tab === 'projects' ? (
            <div className={TABLE_SHELL}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-950/80">
                    <tr>
                      <th className={TH}>Project</th>
                      <th className={TH}>Type of Work</th>
                      <th className={TH}>Location</th>
                      <th className={TH}>Client</th>
                      <th className={TH}>Bids &amp; Pricing</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No projects match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((p) => (
                        <tr key={p.id} className={ROW_HOVER}>
                          <td className={cn(TD, 'max-w-[240px]')}>
                            <Link
                              href={`/project/${p.id}`}
                              className="text-sm font-medium text-slate-900 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-300"
                              target="_blank"
                            >
                              {p.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-slate-400">
                              ID: {shortId(p.id)} · Posted{' '}
                              {formatRelativeTime(p.createdAt)}
                            </p>
                          </td>
                          <td className={TD}>
                            <TradeBadge serviceType={p.serviceType} />
                          </td>
                          <td className={TD}>
                            <div className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>
                                {p.district}, {p.state}
                              </span>
                            </div>
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-700 dark:text-slate-200')}>
                            {p.clientName}
                          </td>
                          <td className={TD}>
                            <BidMetricsCell project={p} />
                          </td>
                          <td className={TD}>
                            <ProjectStatusCell
                              status={p.status}
                              biddingEndsAt={p.biddingEndsAt}
                            />
                          </td>
                          <td className={TD}>
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                disabled={pending}
                                title="Close auction"
                                onClick={() =>
                                  runAction(
                                    () => adminCloseAuctionAction(p.id),
                                    'Auction closed.',
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              >
                                <Lock className="h-3 w-3" />
                                Close
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                title="Extend bidding by 24 hours"
                                onClick={() =>
                                  runAction(
                                    () => adminExtendAuctionAction(p.id, 24),
                                    'Bidding extended by 24h.',
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700"
                              >
                                <TimerReset className="h-3 w-3" />
                                +24h
                              </button>
                              {p.selectedBuilderId ? (
                                <a
                                  href={`/api/agreements/pdf?projectId=${encodeURIComponent(p.id)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-xs transition hover:bg-slate-800"
                                >
                                  <Download className="h-3 w-3" />
                                  PDF
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === 'workers' ? (
            <div className={TABLE_SHELL}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-950/80">
                    <tr>
                      <th className={TH}>Name</th>
                      <th className={TH}>Phone</th>
                      <th className={TH}>Trade</th>
                      <th className={TH}>BuilBid ID</th>
                      <th className={TH}>Location</th>
                      <th className={TH}>Govt ID</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No workers found.
                        </td>
                      </tr>
                    ) : (
                      filteredWorkers.map((w) => (
                        <tr key={w.id} className={ROW_HOVER}>
                          <td className={cn(TD, 'text-sm font-medium text-slate-900 dark:text-slate-100')}>
                            {w.fullName}
                            <p className="mt-0.5 text-xs text-slate-400">
                              Joined {formatRelativeTime(w.createdAt)}
                            </p>
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-600')}>
                            {w.mobile ?? '—'}
                          </td>
                          <td className={TD}>
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {w.tradeType}
                            </span>
                          </td>
                          <td className={cn(TD, 'font-mono text-xs text-slate-500')}>
                            {w.builbidId}
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-600')}>
                            {w.district ?? '—'}
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-600')}>
                            {w.govtId ?? '—'}
                          </td>
                          <td className={TD}>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                                w.isVerified
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-amber-200 bg-amber-50 text-amber-700',
                              )}
                            >
                              {w.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td className={TD}>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                runAction(
                                  () =>
                                    adminToggleWorkerVerificationAction(
                                      w.id,
                                      !w.isVerified,
                                    ),
                                  w.isVerified
                                    ? 'Worker unverified.'
                                    : 'Worker verified.',
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700"
                            >
                              {w.isVerified ? 'Unverify' : 'Verify'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === 'clients' ? (
            <div className={TABLE_SHELL}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-950/80">
                    <tr>
                      <th className={TH}>Client</th>
                      <th className={TH}>Phone</th>
                      <th className={TH}>Email</th>
                      <th className={TH}>Location</th>
                      <th className={TH}>Projects</th>
                      <th className={TH}>Awards</th>
                      <th className={TH}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No clients found.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((c) => (
                        <tr key={c.id} className={ROW_HOVER}>
                          <td className={cn(TD, 'text-sm font-medium text-slate-900 dark:text-slate-100')}>
                            {c.fullName}
                            <p className="mt-0.5 text-xs text-slate-400">
                              ID: {shortId(c.id)}
                            </p>
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-600')}>
                            {c.mobile ?? '—'}
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-600')}>
                            {c.email}
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-600')}>
                            {c.district ?? '—'}
                          </td>
                          <td className={TD}>
                            <span className="inline-flex min-w-[1.75rem] justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {c.projectsPosted}
                            </span>
                          </td>
                          <td className={TD}>
                            <span className="inline-flex min-w-[1.75rem] justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              {c.contractsAwarded}
                            </span>
                          </td>
                          <td className={cn(TD, 'text-xs text-slate-500')}>
                            {formatDate(c.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === 'agreements' ? (
            <div className={TABLE_SHELL}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-950/80">
                    <tr>
                      <th className={TH}>Project</th>
                      <th className={TH}>Client</th>
                      <th className={TH}>Mistri</th>
                      <th className={TH}>Rate</th>
                      <th className={TH}>Execution</th>
                      <th className={TH}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgreements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No awarded agreements yet.
                        </td>
                      </tr>
                    ) : (
                      filteredAgreements.map((a) => (
                        <tr key={a.projectId} className={ROW_HOVER}>
                          <td className={cn(TD, 'max-w-[240px]')}>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {a.projectTitle}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {a.district} · ID: {shortId(a.projectId)}
                            </p>
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-700')}>
                            {a.clientName}
                          </td>
                          <td className={cn(TD, 'text-sm text-slate-700')}>
                            {a.mistriName}
                          </td>
                          <td className={TD}>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {a.rateSummary}
                            </p>
                          </td>
                          <td className={cn(TD, 'text-xs text-slate-500')}>
                            {formatDate(a.executionDate)}
                          </td>
                          <td className={TD}>
                            <div className="flex flex-wrap items-center gap-1">
                              <a
                                href={`/api/agreements/pdf?projectId=${encodeURIComponent(a.projectId)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-xs transition hover:bg-slate-800"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </a>
                              <Link
                                href={`/project/${a.projectId}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Project
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
