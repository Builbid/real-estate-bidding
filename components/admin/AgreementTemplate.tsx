'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Loader2 } from 'lucide-react';
import {
  sendContractAgreementForSignatureAction,
  verifyEmbeddedAgreementOtpAction,
} from '@/app/admin/contract-actions';
import { formatAadhaarInput } from '@/lib/contract/aadhaar';
import { groupMeasurementLines, type MeasuredLineItem } from '@/lib/admin/siteMeasurements';

type Party = 'client' | 'contractor';

type DocCopy = {
  documentTitle: string;
  subtitle: string;
  partyB: string;
  workerNoun: string;
  legal: string;
  specLead: string;
  excluded: string;
  materials: string;
  gateway: string;
  timeline: string;
  materialDelay: string;
  penalty: string;
  footer: string;
};

function tradeCopy(serviceType: string | null, isMistriCivil: boolean): DocCopy {
  const service = (serviceType ?? '').toLowerCase();
  if (service === 'electrician') {
    return {
      documentTitle: 'Digital Construction & Electrician Agreement',
      subtitle: 'Electrician (Electrical Work) | Official platform record',
      partyB: 'Electrician / Worker',
      workerNoun: 'Electrician',
      legal:
        'Legal Notice: This is an official digital contract between the Homeowner and the Electrician. BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
      specLead:
        'Joint site review: the homeowner, the electrician, and the BuilBid field coordinator confirm the fixture counts, wiring routes, and point measurements on site before execution. The checklist record below is the agreed scope.',
      excluded:
        'This agreement covers the electrical points and fixture work measured on the site visit only. Extra points, decorative fixtures, or work outside that schedule must be negotiated separately without BuilBid involvement.',
      materials:
        'Materials: bids cover electrician labour and service charges only. Electrical materials are arranged by the property owner.',
      gateway:
        'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid milestone escrow → Electrician). Direct cash payments to the electrician are prohibited and nullify platform guarantees.',
      timeline:
        'Start date is when physical electrical work begins after materials are confirmed on site. Completion date is the mutually agreed handover for 100% of the awarded electrician work.',
      materialDelay:
        'The homeowner must supply electrical materials on time. Homeowner material delays extend the deadline and void the on-time completion guarantee.',
      penalty:
        'Electrician delay penalty (5%): if the work runs past the 10-day grace period because of an unexcused electrician delay or absenteeism, 5% is deducted from the electrician payout through BuilBid.',
      footer:
        'Official BuilBid digital agreement for awarded electrician work. Cash payments outside the BuilBid gateway void platform guarantees.',
    };
  }
  if (service === 'plumber') {
    return {
      documentTitle: 'Digital Construction & Plumber Agreement',
      subtitle: 'Plumber (Plumbing Work) | Official platform record',
      partyB: 'Plumber / Worker',
      workerNoun: 'Plumber',
      legal:
        'Legal Notice: This is an official digital contract between the Homeowner and the Plumber. BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
      specLead:
        'Joint site review: the homeowner, the plumber, and the BuilBid field coordinator confirm fixture counts and pipe runs on site before execution. The checklist record below is the agreed scope.',
      excluded:
        'This agreement covers the plumbing work measured on the site visit only. Extra bathrooms, decorative fixtures, or work outside that schedule must be negotiated separately without BuilBid involvement.',
      materials:
        'Materials: bids cover plumber labour and service charges only. Plumbing materials are arranged by the property owner.',
      gateway:
        'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid milestone escrow → Plumber). Direct cash payments to the plumber are prohibited and nullify platform guarantees.',
      timeline:
        'Start date is when physical plumbing work begins after materials are confirmed on site. Completion date is the mutually agreed handover for 100% of the awarded plumber work.',
      materialDelay:
        'The homeowner must supply plumbing materials on time. Homeowner material delays extend the deadline and void the on-time completion guarantee.',
      penalty:
        'Plumber delay penalty (5%): if the work runs past the 10-day grace period because of an unexcused plumber delay or absenteeism, 5% is deducted from the plumber payout through BuilBid.',
      footer:
        'Official BuilBid digital agreement for awarded plumber work. Cash payments outside the BuilBid gateway void platform guarantees.',
    };
  }
  if (service === 'painter') {
    return {
      documentTitle: 'Digital Construction & Painter Agreement',
      subtitle: 'Painter (Painting Work) | Official platform record',
      partyB: 'Painter / Worker',
      workerNoun: 'Painter',
      legal:
        'Legal Notice: This is an official digital contract between the Homeowner and the Painter. BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
      specLead:
        'Joint site review: the homeowner, the painter, and the BuilBid field coordinator confirm the measured paint area on site before execution. The checklist record below is the agreed scope.',
      excluded:
        'This agreement covers the painting work measured on the site visit only. Decorative finishes outside that schedule must be negotiated separately without BuilBid involvement.',
      materials:
        'Materials: bids cover painter labour and service charges only. Paint and related materials are arranged by the property owner.',
      gateway:
        'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid milestone escrow → Painter). Direct cash payments to the painter are prohibited and nullify platform guarantees.',
      timeline:
        'Start date is when physical painting begins after materials are confirmed on site. Completion date is the mutually agreed handover for 100% of the awarded painter work.',
      materialDelay:
        'The homeowner must supply paint and related materials on time. Homeowner material delays extend the deadline and void the on-time completion guarantee.',
      penalty:
        'Painter delay penalty (5%): if the work runs past the 10-day grace period because of an unexcused painter delay or absenteeism, 5% is deducted from the painter payout through BuilBid.',
      footer:
        'Official BuilBid digital agreement for awarded painter work. Cash payments outside the BuilBid gateway void platform guarantees.',
    };
  }
  if (isMistriCivil || service === 'labour_contractor' || !service) {
    return {
      documentTitle: 'Digital Construction & Mistri Agreement',
      subtitle: 'Head Mason (Mistri / RCC Civil Work) | Official platform record',
      partyB: 'Head Mason (Mistri)',
      workerNoun: 'Mistri',
      legal:
        'Legal Notice: This is an official digital contract between the Homeowner and the Head Mason (Mistri). BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
      specLead:
        'Joint blueprint review: the homeowner, the mistri, and the BuilBid field coordinator review the site and finalize the plinth area and structural dimensions before execution. The checklist record below is the agreed scope.',
      excluded:
        'Excluded extra / decorative work: this agreement covers the primary structural mistri work accepted during bidding and measured on the site visit. Decorative plastering, complex moulding, or elevation designs are excluded and must be negotiated separately without BuilBid involvement.',
      materials:
        'Materials: bids cover builder labour and service charges only. Materials are arranged by the property owner.',
      gateway:
        'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid milestone escrow → Mistri). Direct cash payments to the mistri are prohibited and nullify platform guarantees.',
      timeline:
        'Start date is when physical construction begins after materials are confirmed. Completion date is the mutually agreed handover for 100% of the structural work.',
      materialDelay:
        'The homeowner must supply materials on time. Homeowner material delays extend the deadline and void the on-time completion guarantee.',
      penalty:
        'Mistri delay penalty (5%): if the project extends beyond the 10-day grace period because of an unexcused mistri delay or absenteeism, 5% is deducted from the mistri payout through BuilBid.',
      footer:
        'Official BuilBid digital agreement for awarded mistri / RCC civil work. Cash payments outside the BuilBid gateway void platform guarantees.',
    };
  }
  const label = service.replace(/_/g, ' ');
  return {
    documentTitle: 'Digital Construction Agreement',
    subtitle: `${label} | Official platform record`,
    partyB: 'Worker',
    workerNoun: 'Worker',
    legal:
      'Legal Notice: This is an official digital contract between the Homeowner and the Worker. BuilBid is a technology marketplace, site coordinator, and payment facilitator only — not an employer, general contractor, or primary party to on-site work.',
    specLead:
      'Joint site review: the homeowner, the worker, and the BuilBid field coordinator confirm the measured scope on site before execution. The checklist record below is the agreed scope.',
    excluded:
      'This agreement covers the work measured on the site visit and accepted on BuilBid. Work outside that schedule must be negotiated separately without BuilBid involvement.',
    materials:
      'Materials: bids cover labour and service charges only. Materials are arranged by the property owner.',
    gateway:
      'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid milestone escrow → Worker). Direct cash payments to the worker are prohibited and nullify platform guarantees.',
    timeline:
      'Start date is when physical work begins after materials are confirmed. Completion date is the mutually agreed handover for 100% of the awarded work.',
    materialDelay:
      'The homeowner must supply materials on time. Homeowner material delays extend the deadline and void the on-time completion guarantee.',
    penalty:
      'Worker delay penalty (5%): if the project extends beyond the 10-day grace period because of an unexcused worker delay or absenteeism, 5% is deducted from the worker payout through BuilBid.',
    footer:
      'Official BuilBid digital agreement for awarded work. Cash payments outside the BuilBid gateway void platform guarantees.',
  };
}

function dmy(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

function inr(value: number | null | undefined): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

function shown(value: string | null | undefined): string {
  const text = value?.trim();
  return text ? text : '—';
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="bg-teal-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
      {children}
    </h3>
  );
}

function Clause({ children, alert }: { children: string; alert?: boolean }) {
  return (
    <p
      className={
        alert
          ? 'border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-semibold leading-relaxed text-red-950'
          : 'border border-slate-300 px-3 py-2 text-[12.5px] leading-relaxed text-slate-800'
      }
    >
      {children}
    </p>
  );
}

function FactTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  if (rows.length === 0) return null;
  return (
    <dl className="border border-slate-300">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-1 border-b border-slate-300 last:border-b-0 sm:grid-cols-[230px_1fr]"
        >
          <dt className="bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:border-r sm:border-slate-300">
            {row.label}
          </dt>
          <dd className="px-3 py-2 text-sm font-medium text-slate-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AgreementTemplate({
  project,
  client,
  contractor,
  startDate,
  completionDate,
  totalCost,
  bidTotal,
  measuredTotal,
  plinthAreaSqft,
  checklistRows,
  lineItems,
  contract,
}: {
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
  checklistRows: Array<{ label: string; value: string }>;
  lineItems: MeasuredLineItem[];
  startDate: string;
  completionDate: string;
  totalCost: number | null;
  bidTotal: number | null;
  measuredTotal: number | null;
  plinthAreaSqft: number | null;
  contract: {
    status: 'pending_esign' | 'partially_signed' | 'signed';
    clientSigned: boolean;
    contractorSigned: boolean;
    approved: boolean;
  } | null;
}) {
  const router = useRouter();
  const doc = tradeCopy(project.serviceType, project.isMistriCivil);
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
  const siteAddress =
    client.address || [project.district, project.state, project.pincode].filter(Boolean).join(', ');
  const districtPincode = [project.district, project.pincode].filter(Boolean).join(' / ') || '—';
  const groups = groupMeasurementLines(lineItems);

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
      title: `Party B — ${doc.partyB}`,
      name: contractor.name,
      aadhaar: contractorAadhaar,
      setAadhaar: setContractorAadhaar,
      otp: contractorOtp,
      setOtp: setContractorOtp,
      signed: Boolean(contract?.contractorSigned),
    },
  ];

  return (
    <article className="mx-auto max-w-[210mm] bg-white text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-300">
      <header className="bg-slate-900 px-5 py-5 text-white sm:px-7">
        <p className="text-sm font-bold tracking-[0.32em]">BUILBID</p>
        <h2 className="mt-1 text-base font-bold uppercase leading-snug sm:text-lg">{doc.documentTitle}</h2>
        <p className="mt-1 text-xs text-slate-300">{doc.subtitle}</p>
      </header>

      <div className="space-y-4 px-4 py-5 sm:px-7 sm:py-6">
        <Clause>{doc.legal}</Clause>

        <section className="space-y-2">
          <SectionTitle>1. Parties to the agreement</SectionTitle>
          <FactTable
            rows={[
              { label: 'Project title', value: project.title },
              { label: 'Project ID', value: shown(project.publicId) },
              { label: 'Party A — Homeowner', value: client.name },
              { label: 'Phone / WhatsApp', value: shown(client.mobile) },
              { label: 'Registered email', value: shown(client.email) },
              { label: 'Site address', value: shown(siteAddress) },
              { label: 'District / Pincode', value: districtPincode },
            ]}
          />
          <FactTable
            rows={[
              { label: `Party B — ${doc.partyB}`, value: contractor.name },
              { label: 'Phone / WhatsApp', value: shown(contractor.mobile) },
              { label: 'Registered email', value: shown(contractor.email) },
              { label: 'BuilBid ID', value: shown(contractor.platformId) },
              { label: 'Govt ID / GST / Reg No', value: shown(contractor.gstNumber) },
            ]}
          />
        </section>

        <section className="space-y-2">
          <SectionTitle>2. Work specifications and site verification</SectionTitle>
          <Clause>{doc.specLead}</Clause>
          <Clause>{doc.excluded}</Clause>
          <Clause>{doc.materials}</Clause>
          {checklistRows.length > 0 ? (
            <FactTable rows={checklistRows} />
          ) : (
            <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Save the site visit checklist first. Its measurements, site conditions, and notes are written into this
              agreement.
            </p>
          )}
          {plinthAreaSqft == null ? (
            <label className="block border border-slate-300 px-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Approximate plinth area (sq. ft.)
              </span>
              <input
                inputMode="decimal"
                placeholder="e.g. 1200"
                value={plinthArea}
                onChange={(e) => setPlinthArea(e.target.value)}
                className="mt-1 h-9 w-full border border-slate-400 bg-white px-2 text-sm text-slate-900 outline-none focus:border-teal-800"
              />
            </label>
          ) : null}
        </section>

        <section className="space-y-2">
          <SectionTitle>3. Fixed rates and payment terms</SectionTitle>
          <Clause>
            Fixed non-negotiable rate: the final bid price accepted on BuilBid is fixed. No bargaining or rate changes
            are permitted after acceptance. Final settlement follows the measured quantities below at these agreed unit
            rates.
          </Clause>
          <Clause alert>{doc.gateway}</Clause>
          {groups.length > 0 ? (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.group} className="border border-slate-300">
                  <p className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    {group.group}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="bg-teal-800 text-white">
                        <tr>
                          <th className="px-3 py-1.5 font-semibold">Item</th>
                          <th className="px-3 py-1.5 text-right font-semibold">Measured</th>
                          <th className="px-3 py-1.5 text-right font-semibold">Rate</th>
                          <th className="px-3 py-1.5 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.lines.map((item) => (
                          <tr key={item.id} className="border-t border-slate-200">
                            <td className="px-3 py-1.5 text-slate-900">{item.label}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {item.quantity.toLocaleString('en-IN')} {item.unit}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {inr(item.rate)}
                              {item.rateMultiplier ? ` × ${item.rateMultiplier}` : ''}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{inr(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <FactTable
              rows={[{ label: 'Awarded work', value: 'As posted and accepted on BuilBid' }]}
            />
          )}
          <FactTable
            rows={[
              { label: 'Agreed project cost', value: inr(totalCost) },
              ...(bidTotal != null && measuredTotal != null
                ? [
                    {
                      label: 'Original accepted bid',
                      value: `${inr(bidTotal)} · Measured difference ${
                        measuredTotal - bidTotal >= 0 ? '+' : '−'
                      }${inr(Math.abs(measuredTotal - bidTotal))}`,
                    },
                  ]
                : []),
            ]}
          />
        </section>

        <section className="space-y-2">
          <SectionTitle>4. Timelines, delays and penalty terms</SectionTitle>
          <FactTable
            rows={[
              { label: 'Agreed start date', value: dmy(startDate) || 'Not recorded on the site visit checklist' },
              {
                label: 'Target completion date',
                value: dmy(completionDate) || 'Not recorded on the site visit checklist',
              },
              { label: 'Grace extension', value: '10 calendar days, penalty free' },
            ]}
          />
          <Clause>{doc.timeline}</Clause>
          <Clause>{doc.materialDelay}</Clause>
          <Clause alert>{doc.penalty}</Clause>
          {!datesReady ? (
            <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Enter the agreed start date and target completion date on the site visit checklist. They fill this
              section automatically.
            </p>
          ) : null}
        </section>

        <section className="space-y-2">
          <SectionTitle>5. Digital authorization — Aadhaar OTP eSign</SectionTitle>
          <Clause>
            {`This is a digital agreement, not a paper agreement. Party A (Homeowner) and Party B (${doc.workerNoun}) each enter their Aadhaar number. The OTP is sent to that account's registered email. When both OTPs are verified, this agreement is marked Approved / Active. There is no thumb impression and no third-party witness.`}
          </Clause>
          {approved ? (
            <p className="inline-flex items-center gap-1.5 border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              <BadgeCheck className="h-4 w-4" />
              Approved / Active. Both Aadhaar OTPs are verified.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {parties.map((row) => (
                <div key={row.party} className="border-2 border-slate-800 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-teal-800">{row.title}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">{row.name}</p>
                  {row.signed ? (
                    <p className="mt-3 border border-emerald-600 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                      Aadhaar OTP verified
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          Aadhaar number
                        </span>
                        <input
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="XXXX XXXX XXXX"
                          value={row.aadhaar}
                          onChange={(e) => row.setAadhaar(formatAadhaarInput(e.target.value))}
                          className="mt-1 h-9 w-full border border-slate-400 bg-white px-2 font-mono text-sm tracking-wide text-slate-900 outline-none focus:border-teal-800"
                        />
                      </label>
                      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                        <label className="block">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            Email OTP
                          </span>
                          <input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="6-digit OTP"
                            value={row.otp}
                            disabled={!sent}
                            onChange={(e) => row.setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="mt-1 h-9 w-full border border-slate-400 bg-white px-2 font-mono text-sm text-slate-900 outline-none focus:border-teal-800 disabled:bg-slate-100"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={!sent || verifying !== null || row.otp.length !== 6}
                          onClick={() => verify(row.party)}
                          className="h-9 border border-slate-800 bg-white px-3 text-[11px] font-bold uppercase tracking-wide text-slate-900 disabled:opacity-40"
                        >
                          {verifying === row.party ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify OTP'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!approved && (!contract?.clientSigned || !contract?.contractorSigned) ? (
            <button
              type="button"
              onClick={sendOtps}
              disabled={
                sending ||
                !datesReady ||
                clientAadhaar.replace(/\D/g, '').length !== 12 ||
                contractorAadhaar.replace(/\D/g, '').length !== 12
              }
              className="inline-flex h-10 items-center justify-center gap-2 bg-teal-800 px-4 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sent ? 'Re-send Aadhaar OTPs' : 'Send Aadhaar OTPs'}
            </button>
          ) : null}
          {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
          {message ? <p className="text-xs font-medium text-emerald-800">{message}</p> : null}
        </section>

        <p className="border-t border-slate-300 pt-3 text-[11px] leading-relaxed text-slate-500">{doc.footer}</p>
      </div>
    </article>
  );
}
