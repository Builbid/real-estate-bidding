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

/** Read WhatsApp settings from environment variables (never log secrets). */
export function getWhatsAppConfig(): WhatsAppConfig | null {
  if (process.env.WHATSAPP_ENABLED === 'false') {
    return null;
  }

  const provider = (process.env.WHATSAPP_PROVIDER ?? 'twilio') as WhatsAppProvider;

  if (provider === 'generic') {
    const apiUrl = process.env.WHATSAPP_API_URL?.trim();
    const apiKey = process.env.WHATSAPP_API_KEY?.trim();
    if (!apiUrl || !apiKey) return null;
    return { enabled: true, provider, generic: { apiUrl, apiKey } };
  }

  const accountSid =
    process.env.TWILIO_ACCOUNT_SID?.trim() ?? process.env.WHATSAPP_API_KEY?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!accountSid || !authToken || !from) return null;

  return {
    enabled: true,
    provider: 'twilio',
    twilio: { accountSid, authToken, from },
  };
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://builbid.in')
  );
}
