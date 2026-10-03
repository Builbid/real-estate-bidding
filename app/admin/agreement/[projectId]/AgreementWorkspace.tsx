'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileSignature,
  FileText,
  HardHat,
  Loader2,
  RefreshCcw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IndianContractDateField } from '@/components/admin/IndianContractDateField';
import { sendContractAgreementForSignatureAction } from '@/app/admin/contract-actions';
import { retryApprovalDispatchAction } from '@/app/admin/site-visit-actions';
import { formatAadhaarInput } from '@/lib/contract/aadhaar';
import { cn } from '@/lib/utils';

type Row = { label: string; value: string };

export interface AgreementWorkspaceProps {
  project: {
    id: string;
    publicId: string;
    title: string;
    district: string;
    state: string;
    serviceType: string | null;
    isMistriCivil: boolean;
  };
  client: { name: string; email: string };
  contractor: { name: string; email: string };
  siteRows: Row[];
  valuesLocked: boolean;
  defaults: {
    plinthAreaSqft: number | null;
    totalCost: number | null;
    startDate: string;
    completionDate: string;
  };
  contract: {
    status: 'pending_esign' | 'partially_signed' | 'signed';
    clientSigned: boolean;
    contractorSigned: boolean;
    approved: boolean;
    approvedAt: string | null;
    otpExpiresAt: string;
  } | null;
  commission: { amount: number; status: string; creditedAt: string } | null;
  thumbRule: {
    snapshotRows: Row[];
    scheduleRows: Row[];
    stageRows: Row[];
    redFlagRows: Row[];
    disclaimer: string;
  } | null;
}

const CARD =
  'rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';

function inr(value: number | null | undefined): string {
  if (value == null) return 'â€”';
  return `â‚¹${value.toLocaleString('en-IN')}`;
}

function RowList({ rows }: { rows: Row[] }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 py-2 sm:grid-cols-[200px_1fr]">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{row.value || 'â€”'}</dd>
        </div>
      ))}
    </dl>
  );
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
  const { project, client, contractor, siteRows, contract, commission, thumbRule, defaults } = props;
  const router = useRouter();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [completionDate, setCompletionDate] = useState(defaults.completionDate);
  const [totalCost, setTotalCost] = useState(
    defaults.totalCost != null ? String(defaults.totalCost) : '',
  );
  const [clientAadhaar, setClientAadhaar] = useState('');
  const [contractorAadhaar, setContractorAadhaar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [retrying, startRetrying] = useTransition();

  const approved = Boolean(contract?.approved);
  const signedAwaitingApproval = contract?.status === 'signed' && !approved;
  const sent = Boolean(contract);

  const docsBase = `/admin/agreement-docs?projectId=${encodeURIComponent(project.id)}`;

  function send() {
    setError(null);
    setMessage(null);
    startSending(async () => {
      const result = await sendContractAgreementForSignatureAction({
        projectId: project.id,
        id: project.id,
        project_id: project.id,
        numeric_id: project.publicId || undefined,
        plinthArea: String(defaults.plinthAreaSqft ?? ''),
        startDate,
        completionDate,
        totalCost,
        clientAadhaar,
        contractorAadhaar,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? 'Agreement sent for Aadhaar OTP eSign.');
      setClientAadhaar('');
      setContractorAadhaar('');
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
          href="/admin/dashboard?tab=projects"
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Agreement &amp; Thumb Rule</h1>
        <p className="mt-1 text-sm text-slate-500">
          {project.title}
          {project.publicId ? ` Â· Project ID ${project.publicId}` : ''} Â· {project.district}, {project.state}
        </p>
      </header>

      <section className={CARD}>
        <ol className="grid gap-2 sm:grid-cols-4">
          <Step done label="1. Site visit checklist" />
          <Step done label="2. Agreement &amp; thumb rule generated" />
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
            Both parties signed. The signed agreement and Mistri Thumb Rule sheet were emailed to{' '}
            {client.name} (Home Owner) and {contractor.name} (Mistri).
          </p>
          {commission ? (
            <p className="mt-2">
              Supervisor commission of <strong>{inr(commission.amount)}</strong> (0.2% of the agreed
              project cost) was credited to your balance.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={CARD}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <FileText className="h-4 w-4 text-emerald-600" />
            Agreement Contract (auto-populated)
          </h2>
          <a
            href={`${docsBase}&kind=agreement`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
          >
            <ExternalLink className="h-3 w-3" />
            Preview draft PDF
          </a>
        </div>
        <RowList
          rows={[
            { label: 'Project', value: project.title },
            { label: 'Project ID', value: project.publicId || project.id.slice(0, 8).toUpperCase() },
            { label: 'Site', value: `${project.district}, ${project.state}` },
            { label: 'Party A â€” Home Owner', value: `${client.name}${client.email ? ` (${client.email})` : ''}` },
            { label: 'Party B â€” Mistri / Contractor', value: `${contractor.name}${contractor.email ? ` (${contractor.email})` : ''}` },
            ...siteRows,
            { label: 'Agreed project cost', value: inr(defaults.totalCost) },
          ]}
        />
      </section>

      <section className={CARD}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <HardHat className="h-4 w-4 text-amber-600" />
            Mistri Thumb Rule instruction sheet
          </h2>
          {thumbRule ? (
            <a
              href={`${docsBase}&kind=thumb`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
            >
              <ExternalLink className="h-3 w-3" />
              Open thumb rule PDF
            </a>
          ) : null}
        </div>
        {thumbRule ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Site snapshot</p>
              <RowList rows={thumbRule.snapshotRows} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Standard thumb rules</p>
              <RowList rows={thumbRule.scheduleRows} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Work sequence</p>
              <RowList rows={thumbRule.stageRows} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Red flags</p>
              <RowList rows={thumbRule.redFlagRows} />
            </div>
            <p className="text-xs text-slate-500">{thumbRule.disclaimer}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Thumb rule sheets are generated for Mistri / civil construction projects only. This
            project&apos;s trade does not use one.
          </p>
        )}
      </section>

      <section className={CARD}>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <FileSignature className="h-4 w-4 text-emerald-600" />
          Aadhaar OTP eSign &amp; approval
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Both the Home Owner and the Mistri receive the draft PDF and a one-time Aadhaar eSign OTP at
          their registered email. When both have signed, the final signed PDFs are emailed to both
          automatically and the project becomes Approved / Active.
        </p>

        {sent ? (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {[
              { name: client.name, role: 'Home Owner', signed: contract?.clientSigned },
              { name: contractor.name, role: 'Mistri / Worker', signed: contract?.contractorSigned },
            ].map((party) => (
              <div
                key={party.role}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                  party.signed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800',
                )}
              >
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {party.role}
                  </span>
                  {party.name}
                </span>
                <span className="text-xs font-bold">{party.signed ? 'Signed' : 'Awaiting OTP'}</span>
              </div>
            ))}
          </div>
        ) : null}

        {!approved ? (
          <div className="space-y-4">
            {!signedAwaitingApproval ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <IndianContractDateField
                    label="â€¢ Start Date (DD/MM/YYYY):"
                    value={startDate}
                    onChange={setStartDate}
                  />
                  <IndianContractDateField
                    label="â€¢ Target Completion Date (DD/MM/YYYY):"
                    value={completionDate}
                    onChange={setCompletionDate}
                    minIso={startDate || undefined}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Plinth Area (from site checklist)"
                    accentLabel={false}
                    value={defaults.plinthAreaSqft != null ? `${defaults.plinthAreaSqft} sq. ft.` : ''}
                    readOnly
                  />
                  <Input
                    label="Total Agreed Project Cost (â‚¹)"
                    accentLabel={false}
                    type="text"
                    inputMode="decimal"
                    prefix="â‚¹"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    readOnly={props.valuesLocked}
                    title={
                      props.valuesLocked
                        ? 'Taken from the accepted bid so the agreed cost cannot be altered.'
                        : undefined
                    }
                  />
                  <Input
                    label="Home Owner Aadhaar Number"
                    accentLabel={false}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="XXXX XXXX XXXX"
                    value={clientAadhaar}
                    onChange={(e) => setClientAadhaar(formatAadhaarInput(e.target.value))}
                  />
                  <Input
                    label="Mistri / Worker Aadhaar Number"
                    accentLabel={false}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="XXXX XXXX XXXX"
                    value={contractorAadhaar}
                    onChange={(e) => setContractorAadhaar(formatAadhaarInput(e.target.value))}
                  />
                </div>
                <Button type="button" className="w-full sm:w-auto" onClick={send} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sendingâ€¦' : sent ? 'Re-send Agreement & OTPs' : 'Send Agreement for Aadhaar OTP eSign'}
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Both parties have signed, but final approval is pending.</p>
                <p className="mt-1 text-xs">
                  The signed PDFs have not been delivered yet (for example an email provider error).
                  Retry to send them to the Home Owner and the Mistri, mark the project Approved /
                  Active and credit your 0.2% commission.
                </p>
                <Button type="button" className="mt-3" onClick={retry} disabled={retrying}>
                  {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Retry final dispatch &amp; approval
                </Button>
              </div>
            )}

            {sent && !signedAwaitingApproval ? (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <RefreshCcw className="h-3 w-3" />
                Refresh signing status
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        {message ? <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">{message}</p> : null}
      </section>
    </main>
  );
}
