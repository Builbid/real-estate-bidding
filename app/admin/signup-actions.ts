'use server';

import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMailTransporter } from '@/lib/email/sendNotification';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { validateAadhaarNumber, normalizeAadhaarNumber } from '@/lib/validation/aadhaar';
import { stripMobileDigits, validateMobile } from '@/lib/validation/mobile';

const STAFF_POSITIONS = new Set(['field_supervisor', 'admin_staff']);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
  const phoneError = validateMobile(phone);
  if (phoneError) return { error: phoneError };
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

function readImage(file: FormDataEntryValue | null, label: string): { error: string } | { file: File } {
  if (!(file instanceof File) || file.size === 0) {
    return { error: `${label} is required.` };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: `${label} must be a JPG, PNG, or WEBP image.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `${label} must be 4 MB or smaller.` };
  }
  return { file };
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
): Promise<{ ok?: true; error?: string }> {
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
      return {
        error: `Could not store OTP (${storeError.message}). Run supabase/migrations/052_supervisor_signup.sql in the Supabase SQL Editor, then try again.`,
      };
    }

    return await sendSignupOtpEmail(draft.email, otpCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected OTP send failure.';
    return { error: message };
  }
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

    if (challengeError) {
      return {
        error: `OTP lookup failed (${challengeError.message}). Run migration 052_supervisor_signup.sql.`,
      };
    }

    if (
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
        role: 'labour_contractor',
        staff_position: draft.role,
      },
    });

    if (createError || !created.user) {
      const message = createError?.message ?? 'Could not create the account.';
      if (/already|registered|exists/i.test(message)) {
        return { error: 'An account with this email already exists. Please login.' };
      }
      return { error: message };
    }

    const userId = created.user.id;
    const frontPath = `${userId}/front.${imageExtension(front.file.type)}`;
    const backPath = `${userId}/back.${imageExtension(back.file.type)}`;

    const frontUpload = await admin.storage
      .from('supervisor-aadhaar')
      .upload(frontPath, Buffer.from(await front.file.arrayBuffer()), {
        contentType: front.file.type,
        upsert: true,
      });
    if (frontUpload.error) {
      await admin.auth.admin.deleteUser(userId);
      return { error: `Could not store the Aadhaar front image (${frontUpload.error.message}).` };
    }

    const backUpload = await admin.storage
      .from('supervisor-aadhaar')
      .upload(backPath, Buffer.from(await back.file.arrayBuffer()), {
        contentType: back.file.type,
        upsert: true,
      });
    if (backUpload.error) {
      await admin.storage.from('supervisor-aadhaar').remove([frontPath]);
      await admin.auth.admin.deleteUser(userId);
      return { error: `Could not store the Aadhaar back image (${backUpload.error.message}).` };
    }

    const { error: recordError } = await admin.from('supervisor_registrations').insert({
      user_id: userId,
      email: draft.email,
      full_name: draft.fullName,
      phone: draft.phone,
      staff_position: draft.role,
      aadhaar_number: draft.aadhaarNumber,
      aadhaar_front_path: frontPath,
      aadhaar_back_path: backPath,
    });

    if (recordError) {
      await admin.storage.from('supervisor-aadhaar').remove([frontPath, backPath]);
      await admin.auth.admin.deleteUser(userId);
      return {
        error: `Could not save registration (${recordError.message}). Run migration 052_supervisor_signup.sql.`,
      };
    }

    await admin.from('profiles').upsert(
      {
        id: userId,
        email: draft.email,
        full_name: draft.fullName,
        mobile: draft.phone,
        role: 'labour_contractor',
        staff_position: draft.role,
        is_admin: false,
        is_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    await admin.from('supervisor_signup_otps').delete().eq('email', draft.email);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed.';
    return { error: message };
  }
}
