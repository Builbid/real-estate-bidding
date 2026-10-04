import { FileSignature } from 'lucide-react';
import { getAuthUser } from '@/lib/supabase/getUser';
import {
  sharedAgreementFromRow,
  type SharedAgreementRecord,
} from '@/lib/admin/sharedAgreement';
import { groupMeasurementLines } from '@/lib/admin/siteMeasurements';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Shared by supervisor',
  pending_esign: 'Awaiting eSign',
  partially_signed: 'Partially signed',
  signed: 'Signed',
};

function inr(value: number | null | undefined): string {
  return value == null ? '—' : `₹${value.toLocaleString('en-IN')}`;
}

function dmy(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/**
 * Agreement copies the site supervisor shared with this account. The same record is shown in the
 * Home Owner's and the Mistri / Worker's dashboard (read through RLS, parties only).
 */
export async function SharedAgreementsPanel({ perspective }: { perspective: 'owner' | 'worker' }) {
  const { supabase, userId } = await getAuthUser();
  const { data, error } = await supabase
    .from('shared_agreements')
    .select('id, project_id, shared_at, snapshot')
    .eq(perspective === 'owner' ? 'owner_id' : 'worker_id', userId)
    .order('shared_at', { ascending: false });

  // Table not migrated yet (or no access): render nothing rather than breaking the dashboard.
  if (error || !data || data.length === 0) return null;

  const agreements = data
    .map((row) => sharedAgreementFromRow(row))
    .filter((r): r is SharedAgreementRecord => r != null);
  if (agreements.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Shared agreements">
      <div className="flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-emerald-500" />
        <h2 className="text-base font-semibold text-foreground">Shared Agreements</h2>
        <span className="text-xs text-muted-foreground">{agreements.length}</span>
      </div>
      <div className="space-y-3">
        {agreements.map(({ id, sharedAt, snapshot: s }) => (
          <article key={id} className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{s.projectTitle}</h3>
                <p className="text-xs text-muted-foreground">
                  {s.tradeLabel}
                  {s.projectPublicId ? ` · Project ID ${s.projectPublicId}` : ''} · {s.location}
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                {s.approved ? 'Approved / Active' : (STATUS_LABEL[s.signatureStatus] ?? 'Shared')}
              </span>
            </div>

            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Home Owner', s.ownerName],
                ['Mistri / Worker', s.workerName],
                ['Start date', dmy(s.startDate)],
                ['Target completion', dmy(s.completionDate)],
                ...(s.plinthAreaSqft ? [['Plinth area', `${s.plinthAreaSqft.toLocaleString('en-IN')} sq. ft.`]] : []),
                ...(s.floors ? [['Floors', String(s.floors)]] : []),
                ...(s.soilLabel ? [['Soil condition', s.soilLabel]] : []),
                ...(s.facilities.length > 0 ? [['Site facilities', s.facilities.join(', ')]] : []),
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            {s.lineItems.length > 0 ? (
              <details className="mt-3 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-foreground">
                  Agreed rates &amp; measured quantities
                </summary>
                <div className="mt-2 space-y-3">
                  {groupMeasurementLines(s.lineItems).map((group) => (
                    <div key={group.group}>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {group.group}
                      </p>
                      <table className="w-full text-left text-xs">
                        <tbody className="divide-y divide-border/60">
                          {group.lines.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1 pr-2 text-foreground">{item.label}</td>
                              <td className="py-1 pr-2 text-right tabular-nums">
                                {item.quantity.toLocaleString('en-IN')} {item.unit}
                              </td>
                              <td className="py-1 pr-2 text-right tabular-nums">
                                {inr(item.rate)}
                                {item.rateMultiplier ? ` × ${item.rateMultiplier}` : ''}
                              </td>
                              <td className="py-1 text-right font-semibold tabular-nums">{inr(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                Total agreed cost
              </span>
              <span className="text-base font-extrabold tabular-nums text-emerald-600 dark:text-emerald-300">
                {inr(s.totalCost)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Shared by your site supervisor on{' '}
              {new Date(sharedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
