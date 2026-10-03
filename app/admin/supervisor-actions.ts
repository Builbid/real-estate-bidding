'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { formatSupervisorAdminId } from '@/lib/admin/data';
import { loadPaymentSlips, settleSupervisorMonth, type PaymentSlip } from '@/lib/admin/settlement';
import { loadSupervisorTerritory, normalizePincodes } from '@/lib/admin/territory';
import { normalizeAadhaarNumber } from '@/lib/validation/aadhaar';

export interface SupervisorProfileDetails {
  name: string;
  email: string;
  phone: string;
  supervisorId: string;
  /** Full 12-digit number; the modal masks it until the supervisor taps "Show". */
  aadhaarNumber: string;
  pincodes: string[];
  slips: PaymentSlip[];
}

/** Full profile for the signed-in supervisor. Fetched only when the profile modal opens. */
export async function loadSupervisorProfileDetailsAction(): Promise<
  { error: string } | { details: SupervisorProfileDetails }
> {
  const session = await requireOfficialAdmin();
  if (isOfficialAdminEmail(session.email)) {
    return { error: 'The official admin account has no supervisor profile.' };
  }

  const admin = createAdminClient();
  const [{ data: supervisor }, { data: registration }, { data: profile }, slips, pincodes] =
    await Promise.all([
      admin
        .from('supervisors')
        .select('supervisor_name, email, phone, id_document_number')
        .eq('user_id', session.userId)
        .maybeSingle(),
      admin
        .from('supervisor_registrations')
        .select('full_name, email, phone, aadhaar_number')
        .eq('user_id', session.userId)
        .maybeSingle(),
      admin.from('profiles').select('full_name, email, mobile').eq('id', session.userId).maybeSingle(),
      loadPaymentSlips(admin, session.userId),
      loadSupervisorTerritory(admin, session.userId),
    ]);

  return {
    details: {
      name:
        supervisor?.supervisor_name?.trim() ||
        registration?.full_name?.trim() ||
        profile?.full_name?.trim() ||
        'Supervisor',
      email: supervisor?.email?.trim() || registration?.email?.trim() || profile?.email || session.email,
      phone: supervisor?.phone?.trim() || registration?.phone?.trim() || profile?.mobile?.trim() || '—',
      supervisorId: formatSupervisorAdminId(session.userId),
      aadhaarNumber: normalizeAadhaarNumber(
        supervisor?.id_document_number || registration?.aadhaar_number || '',
      ),
      pincodes,
      slips,
    },
  };
}

async function requireOfficial() {
  const session = await requireOfficialAdmin();
  if (!isOfficialAdminEmail(session.email)) {
    return { error: 'Only the official admin can manage supervisors.' as const };
  }
  return { session };
}

/** Official admin: replace a supervisor's pin code territory. */
export async function updateSupervisorPincodesAction(
  supervisorId: string,
  rawPincodes: string,
): Promise<{ error?: string; ok?: boolean; pincodes?: string[] }> {
  const guard = await requireOfficial();
  if ('error' in guard) return { error: guard.error };

  const entered = rawPincodes.split(/[\s,;]+/).filter(Boolean);
  const pincodes = normalizePincodes(rawPincodes);
  if (pincodes.length !== new Set(entered.map((e) => e.replace(/\D/g, ''))).size) {
    return { error: 'Every pin code must be a valid 6-digit Indian pin code.' };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('supervisors')
    .update({ assigned_pincodes: pincodes, updated_at: new Date().toISOString() })
    .eq('user_id', supervisorId)
    .select('user_id')
    .maybeSingle();
  if (error) {
    return {
      error: /assigned_pincodes|column/i.test(error.message)
        ? 'Run supabase/migrations/059_supervisor_territory_settlements.sql first.'
        : error.message,
    };
  }
  if (!data) return { error: 'Supervisor not found.' };

  revalidatePath('/admin/dashboard');
  return { ok: true, pincodes };
}

/** Official admin: pay the supervisor everything pending for the month; pending resets to zero. */
export async function settleSupervisorMonthAction(
  supervisorId: string,
  reference?: string,
): Promise<{ error?: string; ok?: boolean; message?: string }> {
  const guard = await requireOfficial();
  if ('error' in guard) return { error: guard.error };

  const admin = createAdminClient();
  const result = await settleSupervisorMonth(admin, {
    supervisorId,
    paidBy: guard.session.userId,
    reference,
  });
  if ('error' in result) {
    return {
      error: /supervisor_settlements|settlement_id|does not exist/i.test(result.error)
        ? 'Run supabase/migrations/059_supervisor_territory_settlements.sql first.'
        : result.error,
    };
  }

  revalidatePath('/admin/dashboard');
  return {
    ok: true,
    message: `Settled ₹${result.slip.amount.toLocaleString('en-IN')} for ${result.slip.periodLabel}. Slip ${result.slip.slipNumber} issued; pending balance is now ₹0.`,
  };
}
