'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { formatSupervisorAdminId } from '@/lib/admin/data';
import { loadPaymentSlips, settleSupervisorMonth, type PaymentSlip } from '@/lib/admin/settlement';
import { loadSupervisorTerritory, normalizePincodes } from '@/lib/admin/territory';
import { findExistingAccountByEmail } from '@/lib/auth/emailRoleGuard';
import { normalizeAadhaarNumber } from '@/lib/validation/aadhaar';
import { formatMobileDisplay, stripMobileDigits, validateMobile } from '@/lib/validation/mobile';

export interface SupervisorProfileDetails {
  name: string;
  email: string;
  phone: string;
  supervisorId: string;
  /** Full 12-digit number; the modal masks it until the supervisor taps "Show". */
  aadhaarNumber: string;
  pincodes: string[];
  slips: PaymentSlip[];
  /** Signed URL for the registration selfie / profile photo, when one was stored. */
  photoUrl: string | null;
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
        .select('supervisor_name, email, phone, id_document_number, photo_path, id_front_path')
        .eq('user_id', session.userId)
        .maybeSingle(),
      admin
        .from('supervisor_registrations')
        .select('full_name, email, phone, aadhaar_number')
        .eq('user_id', session.userId)
        .maybeSingle(),
      admin
        .from('profiles')
        .select('full_name, email, mobile, avatar_url')
        .eq('id', session.userId)
        .maybeSingle(),
      loadPaymentSlips(admin, session.userId),
      loadSupervisorTerritory(admin, session.userId),
    ]);

  const photoPath =
    (typeof supervisor?.photo_path === 'string' && supervisor.photo_path.trim()) ||
    (typeof supervisor?.id_front_path === 'string' && supervisor.id_front_path.trim()) ||
    '';
  let photoUrl: string | null = null;
  if (photoPath) {
    const { data: signed } = await admin.storage
      .from('supervisor-aadhaar')
      .createSignedUrl(photoPath, 60 * 60);
    photoUrl = signed?.signedUrl ?? null;
  }
  if (!photoUrl && typeof profile?.avatar_url === 'string' && profile.avatar_url.trim()) {
    photoUrl = profile.avatar_url.trim();
  }

  const phoneRaw =
    supervisor?.phone?.trim() || registration?.phone?.trim() || profile?.mobile?.trim() || '';

  return {
    details: {
      name:
        supervisor?.supervisor_name?.trim() ||
        registration?.full_name?.trim() ||
        profile?.full_name?.trim() ||
        'Supervisor',
      email: supervisor?.email?.trim() || registration?.email?.trim() || profile?.email || session.email,
      phone: phoneRaw ? formatMobileDisplay(phoneRaw) : '',
      supervisorId: formatSupervisorAdminId(session.userId),
      aadhaarNumber: normalizeAadhaarNumber(
        supervisor?.id_document_number || registration?.aadhaar_number || '',
      ),
      pincodes,
      slips,
      photoUrl,
    },
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Signed-in supervisor: update their own phone number or email. Identity fields stay read-only. */
export async function updateSupervisorContactAction(input: {
  field: 'phone' | 'email';
  value: string;
}): Promise<{ error?: string; ok?: boolean; value?: string }> {
  const session = await requireOfficialAdmin();
  if (isOfficialAdminEmail(session.email)) {
    return { error: 'The official admin account has no supervisor profile.' };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (input.field === 'phone') {
    const phone = stripMobileDigits(input.value);
    const phoneError = validateMobile(phone);
    if (phoneError) return { error: phoneError };

    const { error: supervisorError } = await admin
      .from('supervisors')
      .update({ phone, updated_at: now })
      .eq('user_id', session.userId);
    if (supervisorError && !/0 rows/i.test(supervisorError.message)) {
      return { error: supervisorError.message };
    }
    await admin.from('supervisor_registrations').update({ phone }).eq('user_id', session.userId);
    const { error: profileError } = await admin
      .from('profiles')
      .update({ mobile: phone, updated_at: now })
      .eq('id', session.userId);
    if (profileError) return { error: profileError.message };

    revalidatePath('/admin/dashboard/accounts');
    return { ok: true, value: formatMobileDisplay(phone) };
  }

  const email = input.value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: 'Enter a valid email address.' };
  if (isOfficialAdminEmail(email)) {
    return { error: 'That email is reserved for the official BuilBid admin portal.' };
  }

  const existing = await findExistingAccountByEmail(email);
  if (existing && existing.id !== session.userId) {
    return { error: 'That email is already in use on another BuilBid account.' };
  }

  if (email !== session.email.trim().toLowerCase()) {
    const { error: authError } = await admin.auth.admin.updateUserById(session.userId, {
      email,
      email_confirm: true,
    });
    if (authError) return { error: authError.message };
  }

  const { error: supervisorError } = await admin
    .from('supervisors')
    .update({ email, updated_at: now })
    .eq('user_id', session.userId);
  if (supervisorError && !/0 rows/i.test(supervisorError.message)) {
    return { error: supervisorError.message };
  }
  await admin.from('supervisor_registrations').update({ email }).eq('user_id', session.userId);
  const { error: profileError } = await admin
    .from('profiles')
    .update({ email, updated_at: now })
    .eq('id', session.userId);
  if (profileError) return { error: profileError.message };

  revalidatePath('/admin/dashboard/accounts');
  return { ok: true, value: email };
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
  revalidatePath('/admin/dashboard/accounts');
  return {
    ok: true,
    message: `Settled ₹${result.slip.amount.toLocaleString('en-IN')} for ${result.slip.periodLabel}. Slip ${result.slip.slipNumber} issued; that amount was deducted from the unpaid balance.`,
  };
}
