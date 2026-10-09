/**
 * Shared Zoho India OAuth settings for the BuilBid server.
 * Client secret and refresh token stay on the server.
 */

const DEFAULT_ACCOUNTS_URL = 'https://accounts.zoho.in';
const DEFAULT_REDIRECT_URI = 'https://builbid.in/api/zoho/callback';

export const ZOHO_CRM_SCOPES = 'ZohoCRM.modules.leads.ALL,ZohoCRM.modules.notes.ALL';

export function zohoEnv(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function zohoAccountsUrl(): string {
  return (zohoEnv('ZOHO_ACCOUNTS_URL') || DEFAULT_ACCOUNTS_URL).replace(/\/$/, '');
}

export function zohoRedirectUri(): string {
  return zohoEnv('ZOHO_REDIRECT_URI') || DEFAULT_REDIRECT_URI;
}

export function zohoTokenUrl(): string {
  return `${zohoAccountsUrl()}/oauth/v2/token`;
}

/** Consent URL. prompt=consent makes Zoho issue a new refresh token on Accept. */
export function zohoAuthorizeUrl(): string {
  const params = new URLSearchParams({
    scope: ZOHO_CRM_SCOPES,
    client_id: zohoEnv('ZOHO_CLIENT_ID'),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    redirect_uri: zohoRedirectUri(),
  });
  return `${zohoAccountsUrl()}/oauth/v2/auth?${params.toString()}`;
}
