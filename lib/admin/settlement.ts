import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateSupervisorCommission, SUPERVISOR_PAYOUT_BPS } from '@/lib/admin/constants';
import { inTerritory, loadSupervisorTerritory } from '@/lib/admin/territory';

export interface PaymentSlip {
  id: string;
  slipNumber: string;
  periodMonth: string; // YYYY-MM-01
  periodLabel: string; // e.g. "October 2026"
  amount: number;
  commissionCount: number;
  reference: string | null;
  paidAt: string;
}

/** First day of the current month in IST, as YYYY-MM-01. */
export function currentMonthStartIst(now: Date = new Date()): string {
  const ist = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return `${ist.slice(0, 7)}-01`;
}

export function monthLabel(periodMonth: string): string {
  const d = new Date(`${periodMonth.slice(0, 7)}-01T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** ISO instant of the start of the current IST month (for paid_at comparisons). */
export function currentMonthStartInstant(now: Date = new Date()): string {
  return new Date(`${currentMonthStartIst(now)}T00:00:00+05:30`).toISOString();
}

type SlipRow = {
  id: string;
  slip_number: string;
  period_month: string;
  amount: number | string;
  commission_count: number;
  reference: string | null;
  paid_at: string;
};

export function slipFromRow(row: SlipRow): PaymentSlip {
  const periodMonth = String(row.period_month).slice(0, 10);
  return {
    id: row.id,
    slipNumber: row.slip_number,
    periodMonth,
    periodLabel: monthLabel(periodMonth),
    amount: Number(row.amount),
    commissionCount: Number(row.commission_count),
    reference: row.reference,
    paidAt: row.paid_at,
  };
}

/** All monthly payment slips for a supervisor (newest first). Empty if not migrated. */
export async function loadPaymentSlips(
  admin: SupabaseClient,
  supervisorId: string,
): Promise<PaymentSlip[]> {
  const { data, error } = await admin
    .from('supervisor_settlements')
    .select('id, slip_number, period_month, amount, commission_count, reference, paid_at')
    .eq('supervisor_id', supervisorId)
    .order('paid_at', { ascending: false })
    .limit(240);
  if (error || !data) return [];
  return (data as SlipRow[]).map(slipFromRow);
}

interface CompletedValue {
  projectId: string;
  pincode: string | null;
  value: number | null;
}

/** Completed projects with their final budget (winning bid, else posted budget). */
export async function loadCompletedValues(admin: SupabaseClient): Promise<CompletedValue[]> {
  const { data: projects } = await admin
    .from('projects')
    .select('id, pincode, selected_builder_id, budget_range_min, budget_range_max')
    .eq('status', 'completed')
    .limit(2000);
  const rows = (projects ?? []) as Array<{
    id: string;
    pincode: string | null;
    selected_builder_id: string | null;
    budget_range_min: number | null;
    budget_range_max: number | null;
  }>;
  if (rows.length === 0) return [];

  const { data: bids } = await admin
    .from('bids')
    .select('project_id, builder_id, total_sum_metric')
    .in(
      'project_id',
      rows.map((r) => r.id),
    )
    .eq('is_withdrawn', false)
    .limit(5000);
  const winning = new Map<string, number>();
  for (const bid of (bids ?? []) as Array<{
    project_id: string;
    builder_id: string;
    total_sum_metric: number | string;
  }>) {
    const project = rows.find((r) => r.id === bid.project_id);
    if (project?.selected_builder_id === bid.builder_id) {
      winning.set(bid.project_id, Number(bid.total_sum_metric));
    }
  }

  return rows.map((r) => ({
    projectId: r.id,
    pincode: r.pincode,
    value:
      winning.get(r.id) ??
      (r.budget_range_max != null
        ? Number(r.budget_range_max)
        : r.budget_range_min != null
          ? Number(r.budget_range_min)
          : null),
  }));
}

/** Pending = credited-but-unpaid commissions + 0.2% of in-territory completed works not yet credited. */
export async function pendingBalanceFor(
  admin: SupabaseClient,
  supervisorId: string,
  territory: string[],
  completed?: CompletedValue[],
): Promise<number> {
  const { data: commissions } = await admin
    .from('supervisor_commissions')
    .select('project_id, supervisor_id, amount, status')
    .limit(5000);
  const commissioned = new Set<string>();
  let credited = 0;
  for (const row of (commissions ?? []) as Array<{
    project_id: string;
    supervisor_id: string;
    amount: number | string;
    status: string;
  }>) {
    commissioned.add(row.project_id);
    if (row.supervisor_id === supervisorId && row.status === 'credited') {
      credited += Number(row.amount) || 0;
    }
  }
  const list = completed ?? (await loadCompletedValues(admin));
  const estimated = list
    .filter((c) => !commissioned.has(c.projectId) && inTerritory(c.pincode, territory))
    .reduce((sum, c) => sum + calculateSupervisorCommission(c.value), 0);
  return credited + estimated;
}

/**
 * Settles everything pending for a supervisor in one monthly payment.
 * Marks all their credited commissions as paid, writes a payment slip, and so the
 * pending balance returns to zero for the next cycle.
 */
export async function settleSupervisorMonth(
  admin: SupabaseClient,
  input: { supervisorId: string; paidBy: string; reference?: string | null },
): Promise<{ error: string } | { slip: PaymentSlip }> {
  const territory = await loadSupervisorTerritory(admin, input.supervisorId);

  // 1. Materialise 0.2% commissions for in-territory completed works that were never credited.
  const completed = await loadCompletedValues(admin);
  const { data: existing } = await admin
    .from('supervisor_commissions')
    .select('project_id')
    .limit(5000);
  const commissioned = new Set(((existing ?? []) as Array<{ project_id: string }>).map((r) => r.project_id));
  const missing = completed.filter(
    (c) => !commissioned.has(c.projectId) && inTerritory(c.pincode, territory) && (c.value ?? 0) > 0,
  );
  if (missing.length > 0) {
    const now = new Date().toISOString();
    const { error } = await admin.from('supervisor_commissions').upsert(
      missing.map((c) => ({
        project_id: c.projectId,
        supervisor_id: input.supervisorId,
        project_value: c.value,
        commission_bps: SUPERVISOR_PAYOUT_BPS,
        amount: calculateSupervisorCommission(c.value),
        status: 'credited',
        credited_at: now,
      })),
      { onConflict: 'project_id', ignoreDuplicates: true },
    );
    if (error) return { error: error.message };
  }

  // 2. Everything credited and unpaid for this supervisor.
  const { data: due, error: dueError } = await admin
    .from('supervisor_commissions')
    .select('id, amount')
    .eq('supervisor_id', input.supervisorId)
    .eq('status', 'credited');
  if (dueError) return { error: dueError.message };
  const rows = (due ?? []) as Array<{ id: string; amount: number | string }>;
  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  if (rows.length === 0 || total <= 0) {
    return { error: 'Nothing is pending for this supervisor.' };
  }

  // 3. Payment slip for this month.
  const periodMonth = currentMonthStartIst();
  const slipNumber = `PS-${periodMonth.slice(0, 7).replace('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const paidAt = new Date().toISOString();
  const { data: settlement, error: settleError } = await admin
    .from('supervisor_settlements')
    .insert({
      supervisor_id: input.supervisorId,
      period_month: periodMonth,
      slip_number: slipNumber,
      amount: total,
      commission_count: rows.length,
      reference: input.reference?.trim() || null,
      paid_by: input.paidBy,
      paid_at: paidAt,
    })
    .select('id, slip_number, period_month, amount, commission_count, reference, paid_at')
    .single();
  if (settleError || !settlement) {
    return { error: settleError?.message ?? 'Could not create the payment slip.' };
  }

  // 4. Mark commissions paid -> pending balance becomes zero.
  const { error: payError } = await admin
    .from('supervisor_commissions')
    .update({ status: 'paid', paid_at: paidAt, settlement_id: (settlement as SlipRow).id })
    .in(
      'id',
      rows.map((r) => r.id),
    )
    .eq('status', 'credited');
  if (payError) {
    await admin.from('supervisor_settlements').delete().eq('id', (settlement as SlipRow).id);
    return { error: payError.message };
  }

  return { slip: slipFromRow(settlement as SlipRow) };
}
