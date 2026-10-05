'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, FileSignature, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  sendContractAgreementForSignatureAction,
  verifyEmbeddedAgreementOtpAction,
} from '@/app/admin/contract-actions';
import { formatAadhaarInput } from '@/lib/contract/aadhaar';

type Party = 'client' | 'contractor';

function dmy(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '—';
}

export function AgreementTemplate({
  project,
  client,
  contractor,
  startDate,
  completionDate,
  totalCost,
  plinthAreaSqft,
  siteRows,
  contract,
}: {
  project: { id: string; publicId: string; title: string; district: string; state: string };
  client: { name: string; email: string };
  contractor: { name: string; email: string };
  siteRows: Array<{ label: string; value: string }>;
  startDate: string;
  completionDate: string;
  totalCost: number | null;
  plinthAreaSqft: number | null;
  contract: {
    status: 'pending_esign' | 'partially_signed' | 'signed';
    clientSigned: boolean;
    contractorSigned: boolean;
    approved: boolean;
  } | null;
}) {
  const router = useRouter();
  const [clientAadhaar, setClientAadhaar] = useState('');
  const [contractorAadhaar, setContractorAadhaar] = useState('');
  const [clientOtp, setClientOtp] = useState('');
  const [contractorOtp, setContractorOtp] = useState('');
  const [plinthArea, setPlinthArea] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [verifying, setVerifying] = useState<Party | null>(null);
  const [, startVerifying] = useTransition();

  const datesReady = Boolean(startDate && completionDate);
  const approved = Boolean(contract?.approved);
  const sent = Boolean(contract);

  function sendOtps() {
    setError(null);
    setMessage(null);
    startSending(async () => {
      const result = await sendContractAgreementForSignatureAction({
        projectId: project.id,
        id: project.id,
        project_id: project.id,
        numeric_id: project.publicId || undefined,
        plinthArea: plinthAreaSqft != null ? String(plinthAreaSqft) : plinthArea,
        startDate,
        completionDate,
        totalCost: totalCost != null ? String(totalCost) : '',
        clientAadhaar,
        contractorAadhaar,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? 'Aadhaar OTPs sent to both registered emails.');
      setClientAadhaar('');
      setContractorAadhaar('');
      router.refresh();
    });
  }

  function verify(party: Party) {
    setError(null);
    setMessage(null);
    setVerifying(party);
    startVerifying(async () => {
      const result = await verifyEmbeddedAgreementOtpAction(
        project.id,
        party,
        party === 'client' ? clientOtp : contractorOtp,
      );
      setVerifying(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (party === 'client') setClientOtp('');
      else setContractorOtp('');
      setMessage(result.message ?? 'OTP verified.');
      router.refresh();
    });
  }

  const parties: Array<{
    party: Party;
    title: string;
    name: string;
    aadhaar: string;
    setAadhaar: (value: string) => void;
    otp: string;
    setOtp: (value: string) => void;
    signed: boolean;
  }> = [
    {
      party: 'client',
      title: 'Party A — Homeowner',
      name: client.name,
      aadhaar: clientAadhaar,
      setAadhaar: setClientAadhaar,
      otp: clientOtp,
      setOtp: setClientOtp,
      signed: Boolean(contract?.clientSigned),
    },
    {
      party: 'contractor',
      title: 'Party B — Mistri / Worker',
      name: contractor.name,
      aadhaar: contractorAadhaar,
      setAadhaar: setContractorAadhaar,
      otp: contractorOtp,
      setOtp: setContractorOtp,
      signed: Boolean(contract?.contractorSigned),
    },
  ];

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="border-b border-slate-200 pb-3 dark:border-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">BuilBid digital agreement</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{project.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {project.publicId ? `Project ID ${project.publicId} · ` : ''}
          {project.district}, {project.state}
        </p>
      </header>

      <dl className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
        {[
          ['Party A — Homeowner', `${client.name}${client.email ? ` (${client.email})` : ''}`],
          ['Party B — Mistri / Worker', `${contractor.name}${contractor.email ? ` (${contractor.email})` : ''}`],
          ['Agreed project cost', totalCost != null ? `₹${totalCost.toLocaleString('en-IN')}` : '—'],
          ...siteRows.map((row) => [row.label, row.value] as [string, string]),
        ].map(([label, value]) => (
          <div key={label} className="grid gap-1 py-2 sm:grid-cols-[220px_1fr]">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          4. Timelines, Delays & Penalty Terms
        </h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Agreed start date</dt>
            <dd className="font-semibold">{dmy(startDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Target completion date</dt>
            <dd className="font-semibold">{dmy(completionDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Grace extension</dt>
            <dd className="font-semibold">10 calendar days, penalty free</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          If the work runs past the grace period because of an unexcused contractor delay, 5% is deducted from the
          contractor payout through BuilBid. These dates were agreed on the site visit with the homeowner and the mistri.
        </p>
        {!datesReady ? (
          <p className="mt-2 text-xs font-medium text-amber-700">
            Enter the agreed start date and target completion date on the site visit checklist. They fill this section
            automatically.
          </p>
        ) : null}
      </section>

      <section className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <FileSignature className="h-4 w-4 text-emerald-600" />
          Aadhaar OTP eSign
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Each party enters their Aadhaar number. The OTP is sent to that account&apos;s registered email. When both
          OTPs are verified, the agreement is marked Approved / Active.
        </p>

        {approved ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <BadgeCheck className="h-4 w-4" />
            Approved / Active. Both Aadhaar OTPs are verified.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {plinthAreaSqft == null ? (
              <Input
                label="Approximate plinth area (sq. ft.)"
                accentLabel={false}
                inputMode="decimal"
                placeholder="e.g. 1200"
                value={plinthArea}
                onChange={(e) => setPlinthArea(e.target.value)}
              />
            ) : null}
            {parties.map((row) => (
              <div key={row.party} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{row.title}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.name}</p>
                {row.signed ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">Aadhaar OTP verified</p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <Input
                      label="Aadhaar number"
                      accentLabel={false}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="XXXX XXXX XXXX"
                      value={row.aadhaar}
                      onChange={(e) => row.setAadhaar(formatAadhaarInput(e.target.value))}
                    />
                    <div className="grid gap-2 sm:grid-cols-[140px_auto] sm:items-end">
                      <Input
                        label="Email OTP"
                        accentLabel={false}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="6-digit OTP"
                        value={row.otp}
                        onChange={(e) => row.setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={!sent}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!sent || verifying !== null || row.otp.length !== 6}
                        onClick={() => verify(row.party)}
                      >
                        {verifying === row.party ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Verify OTP
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!contract?.clientSigned || !contract?.contractorSigned ? (
              <Button
                type="button"
                onClick={sendOtps}
                disabled={
                  sending ||
                  !datesReady ||
                  clientAadhaar.replace(/\D/g, '').length !== 12 ||
                  contractorAadhaar.replace(/\D/g, '').length !== 12
                }
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sent ? 'Re-send Aadhaar OTPs' : 'Send Aadhaar OTPs'}
              </Button>
            ) : null}
          </div>
        )}
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
        {message ? <p className="mt-3 text-xs text-emerald-700">{message}</p> : null}
      </section>
    </article>
  );
}
