'use server';

import { createHash, randomInt } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMailTransporter } from '@/lib/email/sendNotification';
import {
  ADMIN_UNAUTHORIZED_MESSAGE,
  BUILBID_OFFICIAL_ADMIN_EMAIL,
  isOfficialAdminEmail,
} from '@/lib/admin/constants';

function hashOtp(code: string): string {
  return createHash('sha256')
    .update(`${code}:${BUILBID_OFFICIAL_ADMIN_EMAIL}:builbid-admin-otp`)
    .digest('hex');
}

function isAlreadyRegisteredError(message: string): boolean {
  return /already|registered|exists/i.test(message);
}

async function ensureOfficialAdminUser(): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminClient();

  const { error: createError } = await admin.auth.admin.createUser({
    email: BUILBID_OFFICIAL_ADMIN_EMAIL,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      full_name: 'BuilBid Official',
    },
  });

  if (createError && !isAlreadyRegisteredError(createError.message)) {
    return { error: createError.message };
  }

  // Best-effort profile sync (needs migration 042 is_admin column).
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = data.users.find(
      (u) => (u.email ?? '').toLowerCase() === BUILBID_OFFICIAL_ADMIN_EMAIL,
    );
    if (user) {
      await admin.from('profiles').upsert(
        {
          id: user.id,
          email: BUILBID_OFFICIAL_ADMIN_EMAIL,
          full_name: 'BuilBid Official',
          role: 'admin',
          is_admin: true,
          is_verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
    }
  } catch {
    // non-fatal
  }

  return { ok: true };
}

async function sendOtpEmail(otpCode: string): Promise<{ ok: true } | { error: string }> {
  try {
    const { transporter, from } = getMailTransporter();
    await transporter.sendMail({
      from,
      to: BUILBID_OFFICIAL_ADMIN_EMAIL,
      subject: 'BuilBid Official Portal — OTP code',
      text: `Your BuilBid Official Admin Portal code is ${otpCode}.\n\nIt expires in about 10 minutes.\nIf you did not request this, ignore this email.`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 8px;color:#0f172a">Official Admin Portal</h2>
          <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 16px">
            Use this one-time code to sign in to the BuilBid staff portal.
          </p>
          <p style="font-size:32px;letter-spacing:0.35em;font-weight:800;color:#0f766e;margin:0 0 16px">
            ${otpCode}
          </p>
          <p style="color:#94a3b8;font-size:12px;margin:0">Expires in about 10 minutes.</p>
        </div>
      `,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP email.';
    return { error: message };
  }
}

/**
 * Send a 6-digit admin OTP via BuilBid Gmail SMTP (not Supabase default mail).
 */
export async function sendOfficialAdminOtpAction(email: string): Promise<{
  ok?: true;
  error?: string;
}> {
  if (!isOfficialAdminEmail(email)) {
    return { error: ADMIN_UNAUTHORIZED_MESSAGE };
  }

  const ensured = await ensureOfficialAdminUser();
  if ('error' in ensured) {
    return { error: ensured.error };
  }

  const admin = createAdminClient();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: BUILBID_OFFICIAL_ADMIN_EMAIL,
  });

  const nativeOtp = linkData?.properties?.email_otp?.trim() || null;

  if (nativeOtp) {
    const mailed = await sendOtpEmail(nativeOtp);
    if ('error' in mailed) return { error: mailed.error };
    return { ok: true };
  }

  // Fallback path if Auth did not return email_otp
  const otpCode = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error: storeError } = await admin.from('admin_otp_challenges').upsert(
    {
      email: BUILBID_OFFICIAL_ADMIN_EMAIL,
      code_hash: hashOtp(otpCode),
      expires_at: expiresAt,
    },
    { onConflict: 'email' },
  );

  if (storeError) {
    return {
      error:
        linkError?.message ||
        storeError.message ||
        'Could not prepare OTP. Run migration 043_admin_otp_challenges.sql in Supabase.',
    };
  }

  const mailed = await sendOtpEmail(otpCode);
  if ('error' in mailed) return { error: mailed.error };
  return { ok: true };
}

/**
 * Verify OTP and establish a Supabase session cookie for the official admin.
 */
export async function verifyOfficialAdminOtpAction(tokenRaw: string): Promise<{
  ok?: true;
  error?: string;
}> {
  const token = tokenRaw.replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) {
    return { error: 'Enter the 6-digit code from your email.' };
  }

  const supabase = await createClient();

  const { error: nativeError } = await supabase.auth.verifyOtp({
    email: BUILBID_OFFICIAL_ADMIN_EMAIL,
    token,
    type: 'email',
  });

  if (!nativeError) {
    await supabase
      .from('profiles')
      .update({
        is_admin: true,
        role: 'admin',
        updated_at: new Date().toISOString(),
      })
      .eq('email', BUILBID_OFFICIAL_ADMIN_EMAIL);
    return { ok: true };
  }

  try {
    const admin = createAdminClient();
    const { data: challenge } = await admin
      .from('admin_otp_challenges')
      .select('code_hash, expires_at')
      .eq('email', BUILBID_OFFICIAL_ADMIN_EMAIL)
      .maybeSingle();

    if (
      !challenge ||
      challenge.code_hash !== hashOtp(token) ||
      new Date(challenge.expires_at).getTime() < Date.now()
    ) {
      return { error: 'Invalid or expired OTP.' };
    }

    await admin.from('admin_otp_challenges').delete().eq('email', BUILBID_OFFICIAL_ADMIN_EMAIL);

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: BUILBID_OFFICIAL_ADMIN_EMAIL,
    });

    const hashed = linkData?.properties?.hashed_token;
    if (linkError || !hashed) {
      return { error: linkError?.message ?? 'Could not create admin session.' };
    }

    const { error: sessionError } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: hashed,
    });

    if (sessionError) {
      return { error: sessionError.message };
    }

    await supabase
      .from('profiles')
      .update({
        is_admin: true,
        role: 'admin',
        updated_at: new Date().toISOString(),
      })
      .eq('email', BUILBID_OFFICIAL_ADMIN_EMAIL);

    return { ok: true };
  } catch {
    return { error: nativeError.message || 'Invalid or expired OTP.' };
  }
}
