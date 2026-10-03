'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  IdCard,
  LogOut,
  MapPin,
  Phone,
  UserRound,
  Wallet,
} from 'lucide-react';
import { adminSignOutAction } from '@/app/admin/actions';
import type { SupervisorProfileDetails } from '@/app/admin/supervisor-actions';
import type { SupervisorAccount } from '@/lib/admin/data';
import { Button } from '@/components/ui/button';

const CARD =
  'rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
const AADHAAR_PLACEHOLDER = 'XXXX XXXX XXXX';

function formatMoney(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function maskAadhaar(value: string): string {
  if (value.length < 4) return AADHAAR_PLACEHOLDER;
  return `XXXX XXXX ${value.slice(-4)}`;
}

function formatAadhaar(value: string): string {
  return value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={CARD}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
          {children}
        </dd>
      </div>
    </div>
  );
}

/**
 * Full-page "Profile & Accounts": financial summary, personal details and the Payment Slips
 * folder. Replaces the old pop-up; opened by tapping the supervisor's avatar / name.
 */
export function SupervisorAccountsView({
  account,
  details,
  error,
}: {
  account: SupervisorAccount;
  details: SupervisorProfileDetails | null;
  error: string | null;
}) {
  const [showAadhaar, setShowAadhaar] = useState(false);
  const slips = details?.slips ?? [];

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <Link
          href="/admin/dashboard?tab=projects"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <form action={adminSignOutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <UserRound className="h-8 w-8" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">
              {account.name}
            </h1>
            <p className="text-sm text-slate-500">Supervisor Profile &amp; Accounts</p>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <section aria-label="Financial summary" className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={Wallet}
            label="Total Amount Received"
            value={formatMoney(account.totalReceived)}
            hint={`Paid out in ${account.monthLabel}`}
          />
          <SummaryCard
            icon={Wallet}
            label="Unpaid / Pending Balance"
            value={formatMoney(account.pendingBalance)}
            hint={`${account.commissionRate} commission · resets to ₹0 after settlement`}
          />
          <SummaryCard
            icon={CalendarClock}
            label="Payment Cycle"
            value="Monthly"
            hint={account.nextPaymentCycle.replace(/^Monthly settlement · /, 'Next settlement · ')}
          />
        </section>

        <section className={CARD} aria-label="Personal details">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Personal details</h2>
          <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            <DetailRow icon={Phone} label="Phone number">
              {details?.phone || '—'}
            </DetailRow>
            <DetailRow icon={IdCard} label="Supervisor Admin ID">
              <span className="font-mono tracking-wide">{details?.supervisorId || '—'}</span>
            </DetailRow>
            <DetailRow icon={IdCard} label="Aadhaar details">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono tracking-wide">
                  {details?.aadhaarNumber
                    ? showAadhaar
                      ? formatAadhaar(details.aadhaarNumber)
                      : maskAadhaar(details.aadhaarNumber)
                    : AADHAAR_PLACEHOLDER}
                </span>
                {details?.aadhaarNumber ? (
                  <button
                    type="button"
                    onClick={() => setShowAadhaar((v) => !v)}
                    aria-label={showAadhaar ? 'Hide Aadhaar number' : 'Show Aadhaar number'}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                ) : (
                  <span className="text-xs font-normal text-slate-400">Not provided yet</span>
                )}
              </span>
            </DetailRow>
            {details?.email ? (
              <DetailRow icon={UserRound} label="Email">
                {details.email}
              </DetailRow>
            ) : null}
            {details ? (
              <DetailRow icon={MapPin} label="Assigned pin codes">
                {details.pincodes.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {details.pincodes.map((pin) => (
                      <span
                        key={pin}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        {pin}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-slate-500">None assigned (all projects visible while testing)</span>
                )}
              </DetailRow>
            ) : null}
          </dl>
        </section>

        <section className={CARD} aria-label="Documents and payment slips">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-emerald-600" aria-hidden />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Documents / Payment Slips
            </h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {slips.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Company-issued payment receipts are stored here after each monthly settlement.
          </p>

          {slips.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
              <FileText className="h-8 w-8 text-slate-300" aria-hidden />
              <p className="text-sm text-slate-500">
                No payment slips yet. A slip appears here after each monthly settlement.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {slips.map((slip) => (
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
          )}
        </section>
      </main>
    </div>
  );
}
