import { getWhatsAppConfig } from './config';
import { normalizePhoneE164 } from './phone';

export interface SendWhatsAppResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/** Send a single WhatsApp text message via Twilio or a generic HTTP API. */
export async function sendWhatsAppMessage(
  toPhone: string,
  body: string,
): Promise<SendWhatsAppResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { ok: false, error: 'WhatsApp is not configured (missing env vars)' };
  }

  const to = normalizePhoneE164(toPhone);
  if (!to) {
    return { ok: false, error: `Invalid phone number: ${toPhone}` };
  }

  if (config.provider === 'generic' && config.generic) {
    return sendViaGeneric(config.generic.apiUrl, config.generic.apiKey, to, body);
  }

  if (config.provider === 'twilio' && config.twilio) {
    return sendViaTwilio(config.twilio, to, body);
  }

  return { ok: false, error: 'Unsupported WhatsApp provider' };
}

async function sendViaTwilio(
  twilio: { accountSid: string; authToken: string; from: string },
  to: string,
  body: string,
): Promise<SendWhatsAppResult> {
  const from = twilio.from.startsWith('whatsapp:')
    ? twilio.from
    : `whatsapp:${twilio.from.startsWith('+') ? twilio.from : `+${twilio.from.replace(/\D/g, '')}`}`;

  const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const params = new URLSearchParams({
    From: from,
    To: toWhatsApp,
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
    return { ok: false, status: res.status, error: text || res.statusText };
  }

  return { ok: true, status: res.status };
}

async function sendViaGeneric(
  apiUrl: string,
  apiKey: string,
  to: string,
  body: string,
): Promise<SendWhatsAppResult> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, message: body, channel: 'whatsapp' }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: text || res.statusText };
  }

  return { ok: true, status: res.status };
}
