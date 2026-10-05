'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCcw,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgreementTemplate } from '@/components/admin/AgreementTemplate';
import { QualityControlForm } from '@/components/admin/QualityControlForm';
import { retryApprovalDispatchAction } from '@/app/admin/site-visit-actions';
import { shareAgreementCopyAction } from '@/app/admin/agreement-share-actions';
import { type MeasuredLineItem } from '@/lib/admin/siteMeasurements';
import { cn } from '@/lib/utils';

type Row = { label: string; value: string };

export interface AgreementWorkspaceProps {
  project: {
    id: string;
    publicId: string;
    title: string;
    district: string;
    state: string;
    pincode: string;
    siteAddress: string;
    serviceType: string | null;
    isMistriCivil: boolean;
  };
  client: { name: string; email: string; mobile: string; address: string; accountId: string };
  contractor: { name: string; email: string; mobile: string; gstNumber: string; platformId: string };
  checklistRows: Row[];
  fittingLabel: string | null;
  valuesLocked: boolean;
  defaults: {
    plinthAreaSqft: number | null;
    totalCost: number | null;
    bidTotal: number | null;
    measuredTotal: number | null;
    startDate: string;
    completionDate: string;
  };
  tradeLabel: string;
  /** Itemised measured quantity x agreed rate lines derived from the Site Visit Checklist. */
  lineItems: MeasuredLineItem[];
  /** ISO timestamp of the last "Share Agreement Copy" (null when never shared). */
  sharedAt: string | null;
  contract: {
    status: 'pending_esign' | 'partially_signed' | 'signed';
    clientSigned: boolean;
    contractorSigned: boolean;
    approved: boolean;
    approvedAt: string | null;
    otpExpiresAt: string;
  } | null;
  commission: { amount: number; status: string; creditedAt: string } | null;
}

const CARD =
  'rounded-xl border border-slate-700/50 bg-slate-900/80 p-5 text-slate-100';

function inr(value: number | null | undefined): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

function Step({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 text-sm font-medium',
        done ? 'text-emerald-300' : active ? 'text-white' : 'text-slate-500',
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {label}
    </li>
  );
}

export function AgreementWorkspace(props: AgreementWorkspaceProps) {
  const { project, client, contractor, contract, commission, defaults, checklistRows, lineItems, fittingLabel } = props;
  const router = useRouter();
  const [startDate] = useState(defaults.startDate);
  const [completionDate] = useState(defaults.completionDate);
  const [partyA, setPartyA] = useState(client.accountId);
  const [partyB, setPartyB] = useState(contractor.platformId);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retrying, startRetrying] = useTransition();
  const [sharing, startSharing] = useTransition();
  const [sharedAt, setSharedAt] = useState<string | null>(props.sharedAt);

  const approved = Boolean(contract?.approved);

  function shareCopy() {
    setError(null);
    setMessage(null);
    startSharing(async () => {
      const result = await shareAgreementCopyAction(project.id, {
        startDate,
        completionDate,
        partyA,
        partyB,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSharedAt(result.sharedAt ?? new Date().toISOString());
      setMessage(result.message ?? 'Documents successfully sent to both account document sections!');
      router.refresh();
    });
  }

  function retry() {
    setError(null);
    setMessage(null);
    startRetrying(async () => {
      const result = await retryApprovalDispatchAction(project.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? 'Approved.');
      router.refresh();
    });
  }

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100">
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/dashboard?tab=agreements"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 hover:text-emerald-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        {approved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-200">
            <BadgeCheck className="h-4 w-4" />
            Approved / Active
          </span>
        ) : null}
      </div>

      <header>
        <h1 className="text-xl font-bold text-white">Digital Agreement</h1>
        <p className="mt-1 text-sm text-slate-400">
          {project.title}
          {project.publicId ? ` · Project ID ${project.publicId}` : ''} · {project.district}, {project.state}
        </p>
      </header>

      <section className={CARD}>
        <ol className="grid gap-2 sm:grid-cols-2">
          <Step done label="1. Site visit checklist" />
          <Step done label="2. Two-party agreement generated" />
        </ol>
      </section>

      {approved ? (
        <section className="rounded-xl border border-emerald-800/50 bg-emerald-950/40 p-5 text-sm text-emerald-100">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Approved / Active. Both parties are verified.
          </p>
          {commission ? (
            <p className="mt-2">
              Supervisor commission of <strong>{inr(commission.amount)}</strong> (0.2% of the agreed
              project cost) was credited to your balance.
            </p>
          ) : null}
        </section>
      ) : null}

      <AgreementTemplate
        project={project}
        client={client}
        contractor={contractor}
        checklistRows={checklistRows}
        lineItems={lineItems}
        fittingLabel={fittingLabel}
        startDate={startDate}
        completionDate={completionDate}
        totalCost={defaults.totalCost}
        bidTotal={defaults.bidTotal}
        measuredTotal={defaults.measuredTotal}
        plinthAreaSqft={defaults.plinthAreaSqft}
        contract={contract}
      />

      {project.isMistriCivil ? (
        <QualityControlForm serviceType={project.serviceType} projectTitle={project.title} />
      ) : null}

      <section className={CARD}>
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <Share2 className="h-4 w-4 text-emerald-400" />
          Send / Share Agreement
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Sends the Digital Construction Agreement PDF and the project quality-control form into the document
          section of both accounts.
          {sharedAt
            ? ` Last shared ${new Date(sharedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`
            : ''}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Party A (Homeowner account ID)"
            accentLabel={false}
            value={partyA}
            onChange={(e) => setPartyA(e.target.value)}
            autoComplete="off"
            className="rounded-lg border-slate-700/50 bg-slate-950"
          />
          <Input
            label="Party B (Mistri / Worker account ID)"
            accentLabel={false}
            value={partyB}
            onChange={(e) => setPartyB(e.target.value)}
            autoComplete="off"
            className="rounded-lg border-slate-700/50 bg-slate-950"
          />
        </div>
        <Button
          type="button"
          className="mt-3"
          onClick={shareCopy}
          disabled={sharing || !partyA.trim() || !partyB.trim()}
        >
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          {sharing ? 'Sending…' : 'Send / Share'}
        </Button>
        {contract?.status === 'signed' && !approved ? (
          <div className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/40 p-4 text-sm text-amber-100">
            <p className="font-semibold">Both parties have signed, but final approval is pending.</p>
            <Button type="button" className="mt-3" onClick={retry} disabled={retrying}>
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Retry final dispatch and approval
            </Button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
        {message ? (
          <p className="mt-3 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-3 py-2 text-sm font-semibold text-emerald-200">
            {message}
          </p>
        ) : null}
      </section>
    </main>
    </div>
  );
}
