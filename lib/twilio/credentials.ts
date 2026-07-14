export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

export function getTwilioCredentials(): TwilioCredentials | null {
  const accountSid =
    process.env.TWILIO_ACCOUNT_SID?.trim() ?? process.env.WHATSAPP_API_KEY?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid || !authToken) return null;

  return { accountSid, authToken };
}
