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
    return { error: `Auth user setup failed: ${createError.message}` };
  }

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
    // non-fatal — portal guard can still use email allowlist
  }

  return { ok: true };
}

async function sendOtpEmail(otpCode: string): Promise<{ ok: true } | { error: string }> {
  try {
    const { transporter, from } = getMailTransporter();

    // Fail fast with a clear SMTP auth error instead of a vague send failure.
    await transporter.verify();

    const info = await transporter.sendMail({
      from,
      to: BUILBID_OFFICIAL_ADMIN_EMAIL,
      subject: 'BuilBid Official Portal OTP',
      text: `Your BuilBid Official Admin Portal code is ${otpCode}.\n\nIt expires in 10 minutes.\nIf you did not request this, ignore this email.`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 8px;color:#0f172a">Official Admin Portal</h2>
          <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 16px">
            Use this one-time code to sign in to the BuilBid staff portal.
          </p>
          <p style="font-size:32px;letter-spacing:0.35em;font-weight:800;color:#0f766e;margin:0 0 16px">
            ${otpCode}
          </p>
          <p style="color:#94a3b8;font-size:12px;margin:0">Expires in 10 minutes.</p>
        </div>
      `,
    });

    if (!info.accepted || info.accepted.length === 0) {
      return {
        error: `Gmail SMTP did not accept the recipient (${BUILBID_OFFICIAL_ADMIN_EMAIL}).`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP email.';
    return {
      error: `OTP email failed: ${message}. Check GMAIL_USER / GMAIL_APP_PASSWORD on Vercel (Production) and redeploy.`,
    };
  }
}

/**
 * Send a 6-digit admin OTP via BuilBid Gmail SMTP only (never Supabase mail).
 */
export async function sendOfficialAdminOtpAction(email: string): Promise<{
  ok?: true;
  error?: string;
}> {
  try {
    if (!isOfficialAdminEmail(email)) {
      return { error: ADMIN_UNAUTHORIZED_MESSAGE };
    }

    const ensured = await ensureOfficialAdminUser();
    if ('error' in ensured) {
      return { error: ensured.error };
    }

    const admin = createAdminClient();
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
        error: `Could not store OTP (${storeError.message}). Run supabase/migrations/043_admin_otp_challenges.sql in the Supabase SQL Editor, then try again.`,
      };
    }

    return await sendOtpEmail(otpCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected OTP send failure.';
    return { error: message };
  }
}

/**
 * Verify OTP and establish a Supabase session cookie for the official admin.
 */
export async function verifyOfficialAdminOtpAction(tokenRaw: string): Promise<{
  ok?: true;
  error?: string;
}> {
  try {
    const token = tokenRaw.replace(/\s/g, '');
    if (!/^\d{6}$/.test(token)) {
      return { error: 'Enter the 6-digit code from your email.' };
    }

    const admin = createAdminClient();
    const { data: challenge, error: challengeError } = await admin
      .from('admin_otp_challenges')
      .select('code_hash, expires_at')
      .eq('email', BUILBID_OFFICIAL_ADMIN_EMAIL)
      .maybeSingle();

    if (challengeError) {
      return {
        error: `OTP lookup failed (${challengeError.message}). Run migration 043_admin_otp_challenges.sql.`,
      };
    }

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

    const supabase = await createClient();
    const { error: sessionError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashed,
    });

    if (sessionError) {
      // Older Auth stacks expect type "email" for the same hashed token.
      const { error: emailTypeError } = await supabase.auth.verifyOtp({
        type: 'email',
        token_hash: hashed,
      });
      if (emailTypeError) {
        return { error: sessionError.message };
      }
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid or expired OTP.';
    return { error: message };
  }
}
