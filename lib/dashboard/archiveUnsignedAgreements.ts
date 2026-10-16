import { createAdminClient } from '@/lib/supabase/admin';
import { isAgreementComplete } from '@/lib/dashboard/completedProjects';
import {
  isStaleUnsignedAgreement,
  UNSIGNED_AGREEMENT_WINDOW_MS,
} from '@/lib/dashboard/unsignedAgreementExpiry';
import type { SupabaseClient } from '@supabase/supabase-js';

const WITH_STAMP =
  'id, status, selected_builder_id, agreement_completed, agreement_status, builder_selected_at, created_at, updated_at';
const WITHOUT_STAMP =
  'id, status, selected_builder_id, agreement_completed, agreement_status, created_at, updated_at';
const CORE_COLUMNS = 'id, status, selected_builder_id, created_at, updated_at';

type AwardedRow = {
  id: string;
  status?: string | null;
  selected_builder_id?: string | null;
  agreement_completed?: boolean | null;
  agreement_status?: string | null;
  builder_selected_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function missingFunction(message: string): boolean {
  return /archive_stale_unsigned_agreements|does not exist|schema cache/i.test(message);
}

async function loadAwardedProjects(admin: SupabaseClient): Promise<AwardedRow[]> {
  const cutoff = new Date(Date.now() - UNSIGNED_AGREEMENT_WINDOW_MS).toISOString();
  const attempts = [WITH_STAMP, WITHOUT_STAMP, CORE_COLUMNS];

  for (const columns of attempts) {
    let query = admin
      .from('projects')
      .select(columns)
      .not('selected_builder_id', 'is', null)
      .neq('status', 'cancelled')
      .limit(500);

    // builder_selected_at is the real clock once migration 075 is applied.
    // Until then, updated_at moves forward on later writes, so only an old
    // updated_at is a safe candidate.
    if (!columns.includes('builder_selected_at')) {
      query = query.lte('updated_at', cutoff);
    }

    const stampColumn = columns.includes('builder_selected_at') ? 'builder_selected_at' : 'updated_at';
    const result = await query.order(stampColumn, { ascending: true });
    if (!result.error) return (result.data ?? []) as unknown as AwardedRow[];

    const message = result.error.message ?? '';
    const missingStamp = columns.includes('builder_selected_at') && /builder_selected_at/i.test(message);
    const missingAgreement =
      columns !== CORE_COLUMNS && /agreement_completed|agreement_status/i.test(message);
    if (missingStamp || missingAgreement) continue;

    console.error('[archive unsigned agreements] could not load projects:', message);
    return [];
  }

  return [];
}

/**
 * Cancels selections that have sat in Agreement Process Running for 24 hours
 * with neither a saved site-visit checklist nor a signed agreement.
 * Returns the project ids removed from the active dashboards.
 */
export async function archiveUnsignedAgreements(): Promise<string[]> {
  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error(
      '[archive unsigned agreements] admin client unavailable:',
      err instanceof Error ? err.message : err,
    );
    return [];
  }

  const rpc = await admin.rpc('archive_stale_unsigned_agreements');
  if (!rpc.error) return [];
  if (!missingFunction(rpc.error.message)) {
    console.error('[archive unsigned agreements] rpc failed:', rpc.error.message);
  }

  const rows = await loadAwardedProjects(admin);
  const candidates = rows.filter(
    (row) =>
      Boolean(row.selected_builder_id) &&
      row.status !== 'cancelled' &&
      !isAgreementComplete(row) &&
      isStaleUnsignedAgreement(row, { checklistCompleted: false, agreementSigned: false }),
  );
  if (candidates.length === 0) return [];

  const ids = candidates.map((row) => row.id);
  const [visits, contracts, documents] = await Promise.all([
    admin.from('project_site_visits').select('project_id').in('project_id', ids),
    admin
      .from('project_digital_contracts')
      .select('project_id, status, approved_at')
      .in('project_id', ids),
    admin
      .from('project_documents')
      .select('project_id')
      .eq('document_type', 'site_checklist')
      .in('project_id', ids),
  ]);

  // An unreadable checklist table must not cancel work that may already be underway.
  if (visits.error) {
    console.error('[archive unsigned agreements] checklist lookup failed:', visits.error.message);
    return [];
  }

  const protectedIds = new Set<string>(
    ((visits.data ?? []) as Array<{ project_id: string }>).map((row) => row.project_id),
  );

  if (!documents.error) {
    for (const row of (documents.data ?? []) as Array<{ project_id: string }>) {
      protectedIds.add(row.project_id);
    }
  } else {
    console.error('[archive unsigned agreements] checklist document lookup failed:', documents.error.message);
  }

  if (!contracts.error) {
    for (const row of (contracts.data ?? []) as Array<{
      project_id: string;
      status?: string | null;
      approved_at?: string | null;
    }>) {
      if (row.status === 'signed' || row.approved_at) protectedIds.add(row.project_id);
    }
  } else if (!/approved_at/i.test(contracts.error.message)) {
    console.error('[archive unsigned agreements] contract lookup failed:', contracts.error.message);
    return [];
  } else {
    const signedOnly = await admin
      .from('project_digital_contracts')
      .select('project_id, status')
      .in('project_id', ids);
    if (signedOnly.error) {
      console.error('[archive unsigned agreements] contract lookup failed:', signedOnly.error.message);
      return [];
    }
    for (const row of (signedOnly.data ?? []) as Array<{ project_id: string; status?: string | null }>) {
      if (row.status === 'signed') protectedIds.add(row.project_id);
    }
  }

  const staleIds = ids.filter((id) => !protectedIds.has(id));
  if (staleIds.length === 0) return [];

  const { error } = await admin.from('projects').update({ status: 'cancelled' }).in('id', staleIds);
  if (error) {
    console.error('[archive unsigned agreements] cancel failed:', error.message);
    return staleIds;
  }

  return staleIds;
}
