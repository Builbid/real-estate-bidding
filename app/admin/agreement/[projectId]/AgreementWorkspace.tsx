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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    serviceType: string | null;
    isMistriCivil: boolean;
  };
  client: { name: string; email: string; mobile: string; address: string };
  contractor: { name: string; email: string; mobile: string; gstNumber: string; platformId: string };
  checklistRows: Row[];
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
  'rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';

function inr(value: number | null | undefined): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

function Step({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 text-sm font-medium',
        done ? 'text-emerald-700 dark:text-emerald-400' : active ? 'text-slate-900 dark:text-white' : 'text-slate-400',
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {label}
    </li>
  );
}

export function AgreementWorkspace(props: AgreementWorkspaceProps) {
  const { project, client, contractor, contract, commission, defaults, checklistRows, lineItems } = props;
  const router = useRouter();
  const [startDate] = useState(defaults.startDate);
  const [completionDate] = useState(defaults.completionDate);
  const [partyA, setPartyA] = useState(client.email);
  const [partyB, setPartyB] = useState(contractor.email);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retrying, startRetrying] = useTransition();
  const [sharing, startSharing] = useTransition();
  const [sharedAt, setSharedAt] = useState<string | null>(props.sharedAt);

  const approved = Boolean(contract?.approved);
  const signedAwaitingApproval = contract?.status === 'signed' && !approved;
  const sent = Boolean(contract);

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
      setShareOpen(false);
      setMessage(result.message ?? 'Agreement and quality-control PDFs shared to both accounts.');
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
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/dashboard?tab=agreements"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        {approved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            <BadgeCheck className="h-4 w-4" />
            Approved / Active
          </span>
        ) : null}
      </div>

      <header>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Digital Agreement</h1>
        <p className="mt-1 text-sm text-slate-500">
          {project.title}
          {project.publicId ? ` · Project ID ${project.publicId}` : ''} · {project.district}, {project.state}
        </p>
      </header>

      <section className={CARD}>
        <ol className="grid gap-2 sm:grid-cols-4">
          <Step done label="1. Site visit checklist" />
          <Step done label="2. Two-party agreement generated" />
          <Step
            done={contract?.status === 'signed'}
            active={sent}
            label={`3. Aadhaar OTP eSign${
              contract && contract.status !== 'signed'
                ? ` (${[contract.clientSigned, contract.contractorSigned].filter(Boolean).length}/2)`
                : ''
            }`}
          />
          <Step done={approved} label="4. Approved / Active" />
        </ol>
      </section>

      {approved ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Both parties signed by Aadhaar OTP eSign. The signed two-party agreement was emailed to{' '}
            {client.name} (Home Owner) and {contractor.name} (Worker).
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
        startDate={startDate}
        completionDate={completionDate}
        totalCost={defaults.totalCost}
        bidTotal={defaults.bidTotal}
        measuredTotal={defaults.measuredTotal}
        plinthAreaSqft={defaults.plinthAreaSqft}
        contract={contract}
      />

      <QualityControlForm serviceType={project.serviceType} projectTitle={project.title} />

      <section className={cn(CARD, 'border-emerald-200/80 dark:border-emerald-900/60')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Share2 className="h-4 w-4 text-emerald-600" />
              Share Agreement & QC Documents
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Sends the agreement PDF and the quality-control form into the document section of both accounts.
              {sharedAt
                ? ` Last shared ${new Date(sharedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`
                : ''}
            </p>
          </div>
          <Button type="button" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" />
            Share Agreement & QC Documents
          </Button>
        </div>
        {signedAwaitingApproval ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Both parties have signed, but final approval is pending.</p>
            <Button type="button" className="mt-3" onClick={retry} disabled={retrying}>
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Retry final dispatch and approval
            </Button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        {message ? <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">{message}</p> : null}
      </section>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Agreement & QC Documents</DialogTitle>
            <DialogDescription>
              Enter each party&apos;s account email or ID. Both receive the signed agreement PDF and the
              project quality-control form in their document section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              label="Party A account email or ID (Homeowner)"
              accentLabel={false}
              value={partyA}
              onChange={(e) => setPartyA(e.target.value)}
              autoComplete="off"
            />
            <Input
              label="Party B account email or ID (Mistri / Worker)"
              accentLabel={false}
              value={partyB}
              onChange={(e) => setPartyB(e.target.value)}
              autoComplete="off"
            />
            <Button type="button" className="w-full" onClick={shareCopy} disabled={sharing || !partyA.trim() || !partyB.trim()}>
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              {sharing ? 'Sharing…' : 'Share to both accounts'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
