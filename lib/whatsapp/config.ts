import { getTwilioCredentials } from '@/lib/twilio/credentials';

export type WhatsAppProvider = 'twilio' | 'generic';

export interface WhatsAppConfig {
  enabled: boolean;
  provider: WhatsAppProvider;
  twilio?: {
    accountSid: string;
    authToken: string;
    from: string;
  };
  generic?: {
    apiUrl: string;
    apiKey: string;
  };
}

/** WhatsApp sends only when production credentials are explicitly enabled. */
export function isWhatsAppProductionEnabled(): boolean {
  return process.env.WHATSAPP_PRODUCTION === 'true';
}

/** Read WhatsApp settings from environment variables (never log secrets). */
export function getWhatsAppConfig(): WhatsAppConfig | null {
  if (process.env.WHATSAPP_ENABLED === 'false') {
    return null;
  }

  if (!isWhatsAppProductionEnabled()) {
    return null;
  }

  const provider = (process.env.WHATSAPP_PROVIDER ?? 'twilio') as WhatsAppProvider;

  if (provider === 'generic') {
    const apiUrl = process.env.WHATSAPP_API_URL?.trim();
    const apiKey = process.env.WHATSAPP_API_KEY?.trim();
    if (!apiUrl || !apiKey) return null;
    return { enabled: true, provider, generic: { apiUrl, apiKey } };
  }

  const creds = getTwilioCredentials();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!creds || !from) return null;

  return {
    enabled: true,
    provider: 'twilio',
    twilio: { accountSid: creds.accountSid, authToken: creds.authToken, from },
  };
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://builbid.in')
  );
}
