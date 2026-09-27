'use server';

import { createHash, createHmac, randomInt, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMailTransporter } from '@/lib/email/sendNotification';
import { isOfficialAdminEmail, TESTING_FIELD_SUPERVISOR_ROLE } from '@/lib/admin/constants';
import { validateAadhaarNumber, normalizeAadhaarNumber } from '@/lib/validation/aadhaar';
import { stripMobileDigits } from '@/lib/validation/mobile';

const STAFF_POSITIONS = new Set(['field_supervisor', 'admin_staff']);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type SupervisorSignupDraft = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  aadhaarNumber: string;
};

function hashSignupOtp(email: string, code: string): string {
  return createHash('sha256')
    .update(`${code}:${email}:builbid-supervisor-signup-otp`)
    .digest('hex');
}

function otpMatches(storedHash: string, email: string, code: string): boolean {
  const next = hashSignupOtp(email, code);
  const left = Buffer.from(storedHash);
  const right = Buffer.from(next);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function imageExtension(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * public.supervisor_signup_otps is created by supabase/migrations/052_supervisor_signup.sql.
 * PostgREST returns PGRST205 / 42P01 when that table is missing or the schema cache is stale.
 */
function isMissingTableError(
  error: { code?: string; message?: string } | null | undefined,
  table: string,
): boolean {
  if (!error) return false;
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    message.includes(table.toLowerCase()) ||
    (message.includes('schema cache') && message.includes(table.toLowerCase())) ||
    (message.includes('does not exist') && message.includes(table.toLowerCase()))
  );
}

function isMissingOtpTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    isMissingTableError(error, 'supervisor_signup_otps') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
}

function fallbackKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'builbid-supervisor-signup-otp-fallback';
}

function signOtpFallback(email: string, code: string, exp: number): string {
  const body = Buffer.from(
    JSON.stringify({ email, exp, hash: hashSignupOtp(email, code) }),
  ).toString('base64url');
  const sig = createHmac('sha256', fallbackKey()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyOtpFallback(email: string, code: string, proof: string): boolean {
  const dot = proof.lastIndexOf('.');
  if (dot <= 0) return false;
  const body = proof.slice(0, dot);
  const sig = proof.slice(dot + 1);
  const expected = createHmac('sha256', fallbackKey()).update(body).digest('base64url');
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      email?: string;
      exp?: number;
      hash?: string;
    };
    if (payload.email !== email || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return false;
    }
    if (!payload.hash) return false;
    return otpMatches(payload.hash, email, code);
  } catch (err) {
    console.error(
      '[supervisor-signup] Could not read the testing OTP proof. Apply supabase/migrations/052_supervisor_signup.sql.',
      err,
    );
    return false;
  }
}

async function issueTestingOtp(
  email: string,
  cause: unknown,
): Promise<{ ok: true; testingOtp: string; otpProof: string }> {
  const otpCode = String(randomInt(100000, 999999));
  const exp = Date.now() + 10 * 60 * 1000;
  console.error(
    '[supervisor-signup] public.supervisor_signup_otps is unavailable. Apply supabase/migrations/052_supervisor_signup.sql and continue with the testing OTP.',
    cause,
  );
  const mailed = await sendSignupOtpEmail(email, otpCode);
  if ('error' in mailed) {
    console.error('[supervisor-signup] Testing OTP email was not sent:', mailed.error);
  }
  return { ok: true, testingOtp: otpCode, otpProof: signOtpFallback(email, otpCode, exp) };
}

/** Format check only. Test screenshots are accepted; the file is not verified as an identity document. */
function resolvedImageType(file: File): string | null {
  const type = file.type.toLowerCase();
  if (type === 'image/jpg' || type === 'image/pjpeg' || type === 'image/jpeg') return 'image/jpeg';
  if (type === 'image/png' || type === 'image/webp') return type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (type.startsWith('image/')) return 'image/jpeg';
  return null;
}

function validateDraft(input: SupervisorSignupDraft): { error: string } | {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  aadhaarNumber: string;
} {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = stripMobileDigits(input.phone);
  const role = input.role.trim();
  const password = input.password;
  const aadhaarNumber = normalizeAadhaarNumber(input.aadhaarNumber);

  if (!fullName || fullName.length < 2) {
    return { error: 'Enter your full name.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' };
  }
  if (isOfficialAdminEmail(email)) {
    return { error: 'This email is reserved for the official admin portal.' };
  }
  if (!/^\d{10}$/.test(phone)) {
    return { error: 'Enter a 10-digit mobile number.' };
  }
  if (!STAFF_POSITIONS.has(role)) {
    return { error: 'Select a role / position.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  const aadhaarError = validateAadhaarNumber(aadhaarNumber);
  if (aadhaarError) return { error: aadhaarError };

  return { fullName, email, phone, role, password, aadhaarNumber };
}

function readImage(
  file: FormDataEntryValue | null,
  label: string,
): { error: string } | { file: File; contentType: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { error: `${label} is required.` };
  }
  const contentType = resolvedImageType(file);
  if (!contentType) {
    return { error: `${label} must be a JPG or PNG image.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `${label} must be 4 MB or smaller.` };
  }
  return { file, contentType };
}

async function sendSignupOtpEmail(email: string, otpCode: string): Promise<{ ok: true } | { error: string }> {
  try {
    const { transporter, from } = getMailTransporter();
    await transporter.verify();
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: 'BuilBid supervisor registration OTP',
      text: `Your BuilBid supervisor registration code is ${otpCode}.\n\nIt expires in 10 minutes.\nIf you did not request this, ignore this email.`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 8px;color:#0f172a">Supervisor registration</h2>
          <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 16px">
            Use this one-time code to confirm your BuilBid supervisor registration.
          </p>
          <p style="font-size:32px;letter-spacing:0.35em;font-weight:800;color:#0f766e;margin:0 0 16px">
            ${otpCode}
          </p>
          <p style="color:#94a3b8;font-size:12px;margin:0">Expires in 10 minutes.</p>
        </div>
      `,
    });
    if (!info.accepted || info.accepted.length === 0) {
      return { error: 'The email server did not accept that address.' };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP email.';
    return { error: `OTP email failed: ${message}` };
  }
}

export async function sendSupervisorSignupOtpAction(
  input: SupervisorSignupDraft,
): Promise<{ ok?: true; error?: string; testingOtp?: string; otpProof?: string }> {
  const draft = validateDraft(input);
  if ('error' in draft) return { error: draft.error };

  try {
    const admin = createAdminClient();
    const otpCode = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: storeError } = await admin.from('supervisor_signup_otps').upsert(
      {
        email: draft.email,
        code_hash: hashSignupOtp(draft.email, otpCode),
        expires_at: expiresAt,
      },
      { onConflict: 'email' },
    );

    if (storeError) {
      if (isMissingOtpTableError(storeError)) {
        return issueTestingOtp(draft.email, storeError);
      }
      console.error(
        '[supervisor-signup] OTP insert failed. Table public.supervisor_signup_otps is defined in supabase/migrations/052_supervisor_signup.sql.',
        storeError,
      );
      return {
        error: `Could not store OTP (${storeError.message}). Run supabase/migrations/052_supervisor_signup.sql in the Supabase SQL Editor, then try again.`,
      };
    }

    return await sendSignupOtpEmail(draft.email, otpCode);
  } catch (err) {
    if (isMissingOtpTableError({ message: err instanceof Error ? err.message : String(err) })) {
      return issueTestingOtp(draft.email, err);
    }
    const message = err instanceof Error ? err.message : 'Unexpected OTP send failure.';
    console.error('[supervisor-signup] OTP send failed.', err);
    return { error: message };
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

function accountAlreadyExists(message: string): boolean {
  return /already|registered|exists/i.test(message);
}

/**
 * Supervisor name, ID documents, and photo live in public.supervisors
 * (supabase/migrations/053_supervisor_profile_link.sql), not on the homeowner/contractor profile.
 */
async function saveSupervisorRecord(
  admin: AdminClient,
  input: {
    userId: string;
    email: string;
    supervisorName: string;
    phone: string;
    staffPosition: string;
    idDocumentNumber: string;
    idFrontPath: string;
    idBackPath: string;
    photoPath: string | null;
  },
): Promise<{ ok: true } | { error: string }> {
  const now = new Date().toISOString();
  const { error } = await admin.from('supervisors').upsert(
    {
      user_id: input.userId,
      email: input.email,
      supervisor_name: input.supervisorName,
      phone: input.phone,
      staff_position: input.staffPosition,
      id_document_number: input.idDocumentNumber,
      id_front_path: input.idFrontPath,
      id_back_path: input.idBackPath,
      photo_path: input.photoPath,
      updated_at: now,
    },
    { onConflict: 'user_id' },
  );

  if (!error) return { ok: true };

  if (isMissingTableError(error, 'supervisors')) {
    console.error(
      '[supervisor-signup] public.supervisors is missing. Apply supabase/migrations/053_supervisor_profile_link.sql. Falling back to supervisor_registrations.',
      error,
    );
    const legacy = await admin.from('supervisor_registrations').upsert(
      {
        user_id: input.userId,
        email: input.email,
        full_name: input.supervisorName,
        phone: input.phone,
        staff_position: input.staffPosition,
        aadhaar_number: input.idDocumentNumber,
        aadhaar_front_path: input.idFrontPath,
        aadhaar_back_path: input.idBackPath,
      },
      { onConflict: 'user_id' },
    );
    if (!legacy.error) return { ok: true };
    console.error(
      '[supervisor-signup] Could not save the supervisor record. Apply supabase/migrations/053_supervisor_profile_link.sql.',
      legacy.error,
    );
    return {
      error: `Could not save the supervisor profile (${legacy.error.message}). Run supabase/migrations/053_supervisor_profile_link.sql.`,
    };
  }

  console.error('[supervisor-signup] Could not upsert public.supervisors.', error);
  return { error: `Could not save the supervisor profile (${error.message}).` };
}

/**
 * Activates a new supervisor profile for dashboard testing.
 * TESTING: is_verified marks the account active/approved and skips interview review.
 * Restore a pending status before official production.
 */
async function activateSupervisorProfile(
  admin: AdminClient,
  input: {
    userId: string;
    email: string;
    fullName: string;
    phone: string;
    staffPosition: string;
  },
): Promise<{ ok: true } | { error: string }> {
  const { error } = await admin.from('profiles').upsert(
    {
      id: input.userId,
      email: input.email,
      full_name: input.fullName,
      mobile: input.phone,
      role: TESTING_FIELD_SUPERVISOR_ROLE,
      staff_position: input.staffPosition,
      is_admin: false,
      is_verified: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[supervisor-signup] Could not activate the supervisor profile.', error);
    return {
      error: `Could not activate the supervisor profile (${error.message}). Run supabase/migrations/054_field_supervisor_role.sql.`,
    };
  }
  return { ok: true };
}

export async function completeSupervisorSignupAction(
  formData: FormData,
): Promise<{ ok?: true; error?: string }> {
  const draft = validateDraft({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    role: String(formData.get('role') ?? ''),
    password: String(formData.get('password') ?? ''),
    aadhaarNumber: String(formData.get('aadhaarNumber') ?? ''),
  });
  if ('error' in draft) return { error: draft.error };

  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  if (confirmPassword !== draft.password) {
    return { error: 'Password and confirm password must match.' };
  }

  const token = String(formData.get('otp') ?? '').replace(/\s/g, '');
  const otpProof = String(formData.get('otpProof') ?? '');
  if (!/^\d{6}$/.test(token)) {
    return { error: 'Enter the 6-digit code from your email.' };
  }

  const front = readImage(formData.get('aadhaarFront'), 'Aadhaar front side image');
  if ('error' in front) return { error: front.error };
  const back = readImage(formData.get('aadhaarBack'), 'Aadhaar back side image');
  if ('error' in back) return { error: back.error };

  try {
    const admin = createAdminClient();
    const { data: challenge, error: challengeError } = await admin
      .from('supervisor_signup_otps')
      .select('code_hash, expires_at')
      .eq('email', draft.email)
      .maybeSingle();

    if (challengeError && isMissingOtpTableError(challengeError)) {
      console.error(
        '[supervisor-signup] OTP lookup skipped because public.supervisor_signup_otps is missing. Apply supabase/migrations/052_supervisor_signup.sql.',
        challengeError,
      );
      if (!verifyOtpFallback(draft.email, token, otpProof)) {
        return { error: 'Invalid or expired OTP.' };
      }
    } else if (challengeError) {
      console.error(
        '[supervisor-signup] OTP lookup failed. See supabase/migrations/052_supervisor_signup.sql.',
        challengeError,
      );
      return {
        error: `OTP lookup failed (${challengeError.message}). Run migration 052_supervisor_signup.sql.`,
      };
    } else if (
      !challenge ||
      !otpMatches(challenge.code_hash, draft.email, token) ||
      new Date(challenge.expires_at).getTime() < Date.now()
    ) {
      return { error: 'Invalid or expired OTP.' };
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: draft.email,
      password: draft.password,
      email_confirm: true,
      user_metadata: {
        full_name: draft.fullName,
        role: TESTING_FIELD_SUPERVISOR_ROLE,
        staff_position: draft.role,
        account_status: 'active',
      },
    });

    if (!created?.user) {
      const message = createError?.message ?? 'Could not create the account.';
      if (createError && accountAlreadyExists(message)) {
        return {
          error:
            'An account with this email already exists. Use a new email address for your Supervisor profile.',
        };
      }
      console.error('[supervisor-signup] Could not create the auth user.', createError);
      return { error: message };
    }

    const userId = created.user.id;

    const frontPath = `${userId}/front.${imageExtension(front.contentType)}`;
    const backPath = `${userId}/back.${imageExtension(back.contentType)}`;
    const frontBytes = Buffer.from(await front.file.arrayBuffer());
    const backBytes = Buffer.from(await back.file.arrayBuffer());

    const frontUpload = await admin.storage.from('supervisor-aadhaar').upload(frontPath, frontBytes, {
      contentType: front.contentType,
      upsert: true,
    });
    if (frontUpload.error) {
      await admin.auth.admin.deleteUser(userId);
      return { error: `Could not store the identification front image (${frontUpload.error.message}).` };
    }

    const backUpload = await admin.storage.from('supervisor-aadhaar').upload(backPath, backBytes, {
      contentType: back.contentType,
      upsert: true,
    });
    if (backUpload.error) {
      await admin.storage.from('supervisor-aadhaar').remove([frontPath]);
      await admin.auth.admin.deleteUser(userId);
      return { error: `Could not store the identification back image (${backUpload.error.message}).` };
    }

    const saved = await saveSupervisorRecord(admin, {
      userId,
      email: draft.email,
      supervisorName: draft.fullName,
      phone: draft.phone,
      staffPosition: draft.role,
      idDocumentNumber: draft.aadhaarNumber,
      idFrontPath: frontPath,
      idBackPath: backPath,
      photoPath: frontPath,
    });
    if ('error' in saved) {
      await admin.storage.from('supervisor-aadhaar').remove([frontPath, backPath]);
      await admin.auth.admin.deleteUser(userId);
      return { error: saved.error };
    }

    const activated = await activateSupervisorProfile(admin, {
      userId,
      email: draft.email,
      fullName: draft.fullName,
      phone: draft.phone,
      staffPosition: draft.role,
    });
    if ('error' in activated) {
      await admin.storage.from('supervisor-aadhaar').remove([frontPath, backPath]);
      await admin.auth.admin.deleteUser(userId);
      return { error: activated.error };
    }

    await admin.from('supervisor_signup_otps').delete().eq('email', draft.email);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed.';
    return { error: message };
  }
}
