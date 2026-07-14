import { getTwilioCredentials } from '@/lib/twilio/credentials';

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  from: string;
}

/** SMS is enabled when Twilio credentials and a sender number are configured. */
export function getSmsConfig(): SmsConfig | null {
  if (process.env.SMS_ENABLED === 'false') {
    return null;
  }

  const creds = getTwilioCredentials();
  const from = process.env.TWILIO_SMS_FROM?.trim();

  if (!creds || !from) return null;

  return { ...creds, from };
}
