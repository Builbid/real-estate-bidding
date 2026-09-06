'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import {
  Building2,
  Clock,
  Download,
  FileText,
  HardHat,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
  Gavel,
  Search,
  ExternalLink,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, STATUS_CONFIG } from '@/lib/utils';

function formatMoney(value: number | null): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
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
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q),
    );
  }, [projects, query]);

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

  function runAction(action: () => Promise<{ error?: string; ok?: boolean } | void>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result && 'error' in result && result.error) {
        setMessage(result.error);
      } else {
        setMessage('Updated successfully.');
      }
    });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-4 py-5 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            BuilBid Official
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Admin Portal</p>
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
                onClick={() => {
                  setTab(id);
                  setQuery('');
                }}
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
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{email}</p>
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
              onClick={() => setTab(id)}
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
          {message ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {message}
            </p>
          ) : null}

          {tab !== 'overview' ? (
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this table…"
                className="pl-9"
              />
            </div>
          ) : null}

          {tab === 'overview' ? (
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: 'Live auctions', value: kpis.liveAuctions, icon: Gavel },
                { label: 'Projects posted', value: kpis.totalProjects, icon: Building2 },
                { label: 'Workers', value: kpis.totalWorkers, icon: HardHat },
                { label: 'Clients', value: kpis.totalClients, icon: Users },
                { label: 'Pending verify', value: kpis.pendingApprovals, icon: Clock },
                { label: 'Bids placed', value: kpis.totalBids, icon: FileText },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-2 text-slate-500">
                    <Icon className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {value.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </section>
          ) : null}

          {tab === 'projects' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-3 py-2.5">Project</th>
                    <th className="px-3 py-2.5">Location</th>
                    <th className="px-3 py-2.5">Client</th>
                    <th className="px-3 py-2.5">Bids</th>
                    <th className="px-3 py-2.5">Low / High / Win</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="max-w-[220px] px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          <Link
                            href={`/project/${p.id}`}
                            className="hover:text-emerald-700 dark:hover:text-emerald-300"
                            target="_blank"
                          >
                            {p.title}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          {p.district}, {p.state}
                        </td>
                        <td className="px-3 py-2.5">{p.clientName}</td>
                        <td className="px-3 py-2.5">{p.bidCount}</td>
                        <td className="px-3 py-2.5 text-xs">
                          {formatMoney(p.lowestBid)} / {formatMoney(p.highestBid)} /{' '}
                          {formatMoney(p.winningBid)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="space-y-1">
                            <Badge className="text-[10px]">
                              {STATUS_CONFIG[p.status]?.label ?? p.status}
                            </Badge>
                            <p className="text-[11px] text-slate-500">
                              {countdownLabel(p.biddingEndsAt)}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() =>
                                runAction(() => adminCloseAuctionAction(p.id))
                              }
                            >
                              Close
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() =>
                                runAction(() => adminExtendAuctionAction(p.id, 24))
                              }
                            >
                              +24h
                            </Button>
                            {p.selectedBuilderId ? (
                              <Button size="sm" variant="outline" asChild>
                                <a
                                  href={`/api/agreements/pdf?projectId=${encodeURIComponent(p.id)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  PDF
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === 'workers' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Trade</th>
                    <th className="px-3 py-2.5">BuilBid ID</th>
                    <th className="px-3 py-2.5">Location</th>
                    <th className="px-3 py-2.5">Govt ID</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                        No workers found.
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((w) => (
                      <tr key={w.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2.5 font-medium">{w.fullName}</td>
                        <td className="px-3 py-2.5">{w.mobile ?? '—'}</td>
                        <td className="px-3 py-2.5">{w.tradeType}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{w.builbidId}</td>
                        <td className="px-3 py-2.5">{w.district ?? '—'}</td>
                        <td className="px-3 py-2.5">{w.govtId ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={w.isVerified ? 'emerald' : 'default'} className="text-[10px]">
                            {w.isVerified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              runAction(() =>
                                adminToggleWorkerVerificationAction(w.id, !w.isVerified),
                              )
                            }
                          >
                            {w.isVerified ? 'Unverify' : 'Verify'}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === 'clients' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-3 py-2.5">Client</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Location</th>
                    <th className="px-3 py-2.5">Projects</th>
                    <th className="px-3 py-2.5">Awards</th>
                    <th className="px-3 py-2.5">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        No clients found.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2.5 font-medium">{c.fullName}</td>
                        <td className="px-3 py-2.5">{c.mobile ?? '—'}</td>
                        <td className="px-3 py-2.5">{c.email}</td>
                        <td className="px-3 py-2.5">{c.district ?? '—'}</td>
                        <td className="px-3 py-2.5">{c.projectsPosted}</td>
                        <td className="px-3 py-2.5">{c.contractsAwarded}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {formatDate(c.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === 'agreements' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-3 py-2.5">Project</th>
                    <th className="px-3 py-2.5">Client</th>
                    <th className="px-3 py-2.5">Mistri</th>
                    <th className="px-3 py-2.5">Rate</th>
                    <th className="px-3 py-2.5">Execution</th>
                    <th className="px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgreements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No awarded agreements yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAgreements.map((a) => (
                      <tr key={a.projectId} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2.5 font-medium">
                          {a.projectTitle}
                          <p className="text-[11px] text-slate-500">{a.district}</p>
                        </td>
                        <td className="px-3 py-2.5">{a.clientName}</td>
                        <td className="px-3 py-2.5">{a.mistriName}</td>
                        <td className="px-3 py-2.5">{a.rateSummary}</td>
                        <td className="px-3 py-2.5 text-xs">{formatDate(a.executionDate)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="outline" asChild>
                              <a
                                href={`/api/agreements/pdf?projectId=${encodeURIComponent(a.projectId)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download PDF
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/project/${a.projectId}`} target="_blank">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Project
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
