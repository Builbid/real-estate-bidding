import { parseProviderError } from '@/lib/twilio/errors';
import { normalizePhoneE164 } from '@/lib/whatsapp/phone';
import type { SmsConfig } from './config';
import { getSmsConfig } from './config';

export interface SendSmsResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/** Send a single SMS via Twilio. */
export async function sendSmsMessage(
  toPhone: string,
  body: string,
): Promise<SendSmsResult> {
  const config = getSmsConfig();
  if (!config) {
    return { ok: false, error: 'SMS is not configured (set TWILIO_SMS_FROM + Twilio credentials)' };
  }

  const to = normalizePhoneE164(toPhone);
  if (!to) {
    return { ok: false, error: `Invalid phone number: ${toPhone}` };
  }

  return sendViaTwilio(config, to, body);
}

async function sendViaTwilio(
  twilio: SmsConfig,
  to: string,
  body: string,
): Promise<SendSmsResult> {
  const from = twilio.from.startsWith('+')
    ? twilio.from
    : `+${twilio.from.replace(/\D/g, '')}`;

  const params = new URLSearchParams({
    From: from,
    To: to,
    Body: body,
  });

  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`;
  const auth = Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: parseProviderError(text) || res.statusText };
  }

  return { ok: true, status: res.status };
}
