'use client';

import { useEffect, useState } from 'react';
import {
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  Loader2,
  MapPin,
  UserRound,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  loadSupervisorProfileDetailsAction,
  type SupervisorProfileDetails,
} from '@/app/admin/supervisor-actions';
import type { SupervisorAccount } from '@/lib/admin/data';
import { cn } from '@/lib/utils';

function formatMoney(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function maskAadhaar(value: string): string {
  if (value.length < 4) return '—';
  return `XXXX XXXX ${value.slice(-4)}`;
}

function formatAadhaar(value: string): string {
  return value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function ProfileRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[150px_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
        {children}
      </dd>
    </div>
  );
}

/**
 * "Supervisor Profile & Accounts Details": full identity (phone, supervisor ID, Aadhaar),
 * this month's accounts and the Payment Slips folder. Sensitive values are fetched only when
 * this opens, never rendered in the dashboard header.
 */
export function SupervisorProfileModal({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SupervisorAccount;
}) {
  const [details, setDetails] = useState<SupervisorProfileDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [slipsOpen, setSlipsOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadSupervisorProfileDetailsAction()
      .then((result) => {
        if (cancelled) return;
        if ('error' in result) setError(result.error);
        else setDetails(result.details);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your profile. Please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const loading = !details && !error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-emerald-600" />
            Supervisor Profile &amp; Accounts Details
          </DialogTitle>
          <DialogDescription>
            Your full profile and monthly payment receipts. Keep these details private.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile…
          </p>
        ) : null}
        {error ? <p className="py-4 text-sm text-red-600">{error}</p> : null}

        {details ? (
          <div className="space-y-5">
            <section>
              <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">Full profile</h3>
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 dark:divide-slate-800 dark:border-slate-700">
                <ProfileRow label="Name">{details.name}</ProfileRow>
                <ProfileRow label="Phone number">{details.phone}</ProfileRow>
                <ProfileRow label="Supervisor ID">{details.supervisorId}</ProfileRow>
                <ProfileRow label="Aadhaar number">
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono tracking-wide">
                      {details.aadhaarNumber
                        ? showAadhaar
                          ? formatAadhaar(details.aadhaarNumber)
                          : maskAadhaar(details.aadhaarNumber)
                        : '—'}
                    </span>
                    {details.aadhaarNumber ? (
                      <button
                        type="button"
                        onClick={() => setShowAadhaar((v) => !v)}
                        aria-label={showAadhaar ? 'Hide Aadhaar number' : 'Show Aadhaar number'}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </span>
                </ProfileRow>
                <ProfileRow label="Email">{details.email}</ProfileRow>
                <ProfileRow label="Assigned pin codes">
                  {details.pincodes.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {details.pincodes.map((pin) => (
                        <span
                          key={pin}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                        >
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {pin}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      None assigned yet. Contact BuilBid admin to receive projects.
                    </span>
                  )}
                </ProfileRow>
              </dl>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Accounts</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Total Amount Received · {account.monthLabel}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{formatMoney(account.totalReceived)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Unpaid / Pending Balance
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{formatMoney(account.pendingBalance)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {account.commissionRate} commission on assigned projects · {account.nextPaymentCycle}.
                After your monthly payment is settled, the pending balance resets to ₹0.
              </p>
            </section>

            <section>
              <button
                type="button"
                onClick={() => setSlipsOpen((v) => !v)}
                aria-expanded={slipsOpen}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                {slipsOpen ? (
                  <FolderOpen className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Folder className="h-5 w-5 text-emerald-600" />
                )}
                <span className="flex-1 text-sm font-bold text-slate-900 dark:text-white">
                  Payment Slips
                  <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {details.slips.length}
                  </span>
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 text-slate-500 transition', slipsOpen && 'rotate-180')}
                />
              </button>

              {slipsOpen ? (
                details.slips.length === 0 ? (
                  <p className="px-1 pt-3 text-sm text-slate-500">
                    No payment slips yet. A slip appears here after each monthly settlement.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {details.slips.map((slip) => (
                      <li
                        key={slip.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {slip.periodLabel}
                          </p>
                          <p className="text-xs text-slate-500">
                            {slip.slipNumber} · {formatMoney(slip.amount)} · {slip.commissionCount}{' '}
                            {slip.commissionCount === 1 ? 'project' : 'projects'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/admin/payment-slip?id=${slip.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </a>
                          <a
                            href={`/admin/payment-slip?id=${slip.id}&download=1`}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
