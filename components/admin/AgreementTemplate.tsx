'use client';

import { ESignModule } from '@/components/admin/eSignModule';
import { groupMeasurementLines, type MeasuredLineItem } from '@/lib/admin/siteMeasurements';
import {
  DELAY_PENALTY_CLAUSE,
  PAYMENT_GATEWAY_CLAUSE,
  graceDaysForService,
  graceExtensionLabel,
} from '@/lib/contract/agreementTerms';

function floorSubtotalLabel(group: string, lines: MeasuredLineItem[]): string {
  const multiplier = Math.max(...lines.map((line) => (line.rateMultiplier && line.rateMultiplier > 0 ? line.rateMultiplier : 1)));
  const percent = Math.round((multiplier - 1) * 100);
  return percent > 0 ? `${group} Subtotal (+${percent}% rate)` : `${group} Subtotal`;
}

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
        'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid Payment Gateway → Electrician). Direct cash payments to the electrician are prohibited and nullify platform guarantees.',
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
        'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid Payment Gateway → Plumber). Direct cash payments to the plumber are prohibited and nullify platform guarantees.',
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
        'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid Payment Gateway → Painter). Direct cash payments to the painter are prohibited and nullify platform guarantees.',
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
        'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid Payment Gateway → Mistri). Direct cash payments to the mistri are prohibited and nullify platform guarantees.',
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
      'Mandatory BuilBid payment gateway: all funds flow through BuilBid (Homeowner → BuilBid Payment Gateway → Worker). Direct cash payments to the worker are prohibited and nullify platform guarantees.',
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
          ? 'border border-red-900 bg-red-950/60 px-3 py-2 text-[12.5px] font-semibold leading-relaxed text-red-100'
          : 'border border-slate-700 px-3 py-2 text-[12.5px] leading-relaxed text-slate-200'
      }
    >
      {children}
    </p>
  );
}

function FactTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  if (rows.length === 0) return null;
  return (
    <dl className="border border-slate-700">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-1 border-b border-slate-700 last:border-b-0 sm:grid-cols-[230px_1fr]"
        >
          <dt className="bg-slate-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:border-r sm:border-slate-700">
            {row.label}
          </dt>
          <dd className="bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100">{row.value}</dd>
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
  fittingLabel,
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
  fittingLabel: string | null;
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
  const doc = tradeCopy(project.serviceType, project.isMistriCivil);
  const datesReady = Boolean(startDate && completionDate);
  const siteAddress =
    client.address || [project.district, project.state, project.pincode].filter(Boolean).join(', ');
  const districtPincode = [project.district, project.pincode].filter(Boolean).join(' / ') || '—';
  const groups = groupMeasurementLines(lineItems);
  const grandTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const graceDays = graceDaysForService(project.serviceType, project.isMistriCivil);
  const specRows = [...checklistRows];
  if (
    plinthAreaSqft != null &&
    plinthAreaSqft > 0 &&
    !specRows.some((row) => row.label === 'Total Plinth Area (Sq. Ft.)')
  ) {
    specRows.push({
      label: 'Total Plinth Area (Sq. Ft.)',
      value: plinthAreaSqft.toLocaleString('en-IN'),
    });
  }
  if (fittingLabel) {
    specRows.push({ label: 'Fitting type', value: fittingLabel });
  }

  return (
    <article className="mx-auto max-w-[210mm] border border-slate-700 bg-slate-950 text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <header className="bg-slate-900 px-5 py-5 text-white sm:px-7">
        <h2 className="text-base font-bold uppercase leading-snug tracking-wide sm:text-lg">
          BUILBID DIGITAL CONSTRUCTION AGREEMENT
        </h2>
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
            ]}
          />
        </section>

        <section className="space-y-2">
          <SectionTitle>2. Work specifications and site verification</SectionTitle>
          <Clause>{doc.specLead}</Clause>
          <Clause>{doc.excluded}</Clause>
          <Clause>{doc.materials}</Clause>
          {specRows.length > 0 ? (
            <FactTable rows={specRows} />
          ) : (
            <p className="border border-amber-700 bg-amber-950 px-3 py-2 text-xs font-medium text-amber-200">
              Save the site visit checklist first. Its measurements and notes are written into this agreement.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <SectionTitle>3. Fixed rates and payment terms</SectionTitle>
          <Clause>
            Fixed non-negotiable rate: the final bid price accepted on BuilBid is fixed. No bargaining or rate changes
            are permitted after acceptance. Final settlement follows the measured quantities below at these agreed unit
            rates.
          </Clause>
          <Clause alert>{PAYMENT_GATEWAY_CLAUSE}</Clause>
          {groups.length > 0 ? (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.group} className="border border-slate-700">
                  <p className="bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-300">
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
                          <tr key={item.id} className="border-t border-slate-800">
                            <td className="px-3 py-1.5 text-slate-100">{item.label}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-slate-200">
                              {item.quantity.toLocaleString('en-IN')} {item.unit}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-slate-200">
                              {inr(item.rate)}
                              {item.rateMultiplier ? ` × ${item.rateMultiplier}` : ''}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-50">
                              {inr(item.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-teal-800 bg-slate-900">
                          <td className="px-3 py-2 font-bold text-teal-200" colSpan={3}>
                            {floorSubtotalLabel(group.group, group.lines)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-teal-100">
                            {inr(group.lines.reduce((sum, item) => sum + item.amount, 0))}
                          </td>
                        </tr>
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
              {
                label: 'Grand Total',
                value: inr(lineItems.length > 0 ? grandTotal : totalCost),
              },
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
              { label: 'Grace extension', value: graceExtensionLabel(graceDays) },
            ]}
          />
          <Clause>{doc.timeline}</Clause>
          <Clause>{doc.materialDelay}</Clause>
          <Clause alert>{DELAY_PENALTY_CLAUSE}</Clause>
          {!datesReady ? (
            <p className="border border-amber-700 bg-amber-950 px-3 py-2 text-xs font-medium text-amber-200">
              Enter the agreed start date and target completion date on the site visit checklist. They fill this
              section automatically.
            </p>
          ) : null}
        </section>

        <section className="space-y-2">
          <SectionTitle>5. Digital authorization — Aadhaar OTP eSign</SectionTitle>
          <Clause>
            {`This is a digital agreement. Party A (Homeowner) and Party B (${doc.workerNoun}) each enter a 12-digit Aadhaar number and a 6-digit OTP. Verify OTP marks that party Verified. When both parties are verified, the agreement is Approved / Active.`}
          </Clause>
          <ESignModule
            projectId={project.id}
            clientName={client.name}
            contractorName={contractor.name}
            partyBTitle={doc.partyB}
            clientSigned={Boolean(contract?.clientSigned)}
            contractorSigned={Boolean(contract?.contractorSigned)}
            approved={Boolean(contract?.approved)}
          />
        </section>

        <p className="border-t border-slate-700 pt-3 text-[11px] leading-relaxed text-slate-400">{doc.footer}</p>
      </div>
    </article>
  );
}
