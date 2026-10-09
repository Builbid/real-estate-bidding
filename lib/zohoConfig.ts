/**
 * Shared Zoho India OAuth settings for the BuilBid server.
 * Env values win after trimming. The verified API Console client is used when
 * an env var is missing or still set to the previous BuilBid client.
 */

import https from 'node:https';

const DEFAULT_ACCOUNTS_URL = 'https://accounts.zoho.in';
const DEFAULT_REDIRECT_URI = 'https://builbid.in/api/zoho/callback';

/** Current Server-based client from the Zoho India API Console. */
const VERIFIED_CLIENT_ID = '1000.96NFA79HWDAM3XHIO7MUS2PG9TBSOS';
const VERIFIED_CLIENT_SECRET = 'cdcdb2ed6afa9352f3a3a9c3e5f6b91cd7cdfab93';

/** Previous client. Zoho returns invalid_client_secret when this secret is sent with the new client id. */
const PREVIOUS_CLIENT_ID = '1000.91JM8KSK4SC0SH9C2OUFS90KVSQM8V';
const PREVIOUS_CLIENT_SECRET = 'd112da84ccdde943a377235aafe76707b91144c30e';

export const ZOHO_CRM_SCOPES = 'ZohoCRM.modules.leads.ALL,ZohoCRM.modules.notes.ALL';

/** Trim whitespace, wrapping quotes, and invisible characters from an env value. */
export function zohoEnv(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== 'string') return '';
  let value = raw.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  while (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function zohoClientId(): string {
  const value = zohoEnv('ZOHO_CLIENT_ID');
  if (!value || value === PREVIOUS_CLIENT_ID) return VERIFIED_CLIENT_ID;
  return value;
}

export function zohoClientSecret(): string {
  const value = zohoEnv('ZOHO_CLIENT_SECRET');
  if (!value || value === PREVIOUS_CLIENT_SECRET) return VERIFIED_CLIENT_SECRET;
  return value;
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

/**
 * POST form fields to Zoho Accounts over IPv4.
 * Vercel's default fetch tries IPv6 first, and accounts.zoho.in does not answer
 * on that path, so the token exchange times out.
 */
export function postZohoForm(
  url: string,
  params: URLSearchParams,
): Promise<{ status: number; text: string }> {
  const body = params.toString();
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        family: 4,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/json',
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.setTimeout(12_000, () => {
      req.destroy(new Error('Timed out contacting Zoho accounts.'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Consent URL. prompt=consent makes Zoho issue a new refresh token on Accept. */
export function zohoAuthorizeUrl(): string {
  const params = new URLSearchParams({
    scope: ZOHO_CRM_SCOPES,
    client_id: zohoClientId(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    redirect_uri: zohoRedirectUri(),
  });
  return `${zohoAccountsUrl()}/oauth/v2/auth?${params.toString()}`;
}
