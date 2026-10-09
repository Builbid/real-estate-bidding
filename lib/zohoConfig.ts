/**
 * Shared Zoho India OAuth settings for the BuilBid server.
 * Env values win after trimming. The verified API Console client is used when
 * an env var is missing or still set to the previous BuilBid client.
 */

import https from 'node:https';

const DEFAULT_ACCOUNTS_URL = 'https://accounts.zoho.in';
const DEFAULT_REDIRECT_URI = 'https://builbid.in/api/zoho/callback';

/** Zoho India Self Client. Refresh tokens from this client must use this same pair. */
const VERIFIED_CLIENT_ID = '1000.KM0IB43H95DTV75U0GY7COT29OQUKH';
const VERIFIED_CLIENT_SECRET = '07e795f6c36079a839e17b6e2d12911d616bcf2082';

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

/** Earlier BuilBid clients. A refresh token from the Self Client is rejected if these are sent. */
const STALE_CLIENT_IDS = new Set([
  '1000.96NFA79HWDAM3XHIO7MUS2PG9TBSOS',
  '1000.91JM8KSK4SC0SH9C2OUFS90KVSQM8V',
]);
const STALE_CLIENT_SECRETS = new Set([
  'cdcdb2ed6afa9352f3a3a9c3e5f6b91cd7cdfab93',
  'd112da84ccdde943a377235aafe76707b91144c30e',
]);

/**
 * ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET win when Vercel has the current Self Client.
 * A leftover previous client falls back to the verified pair so token refresh still matches.
 */
export function zohoClientId(): string {
  const fromEnv = zohoEnv('ZOHO_CLIENT_ID');
  if (fromEnv && !STALE_CLIENT_IDS.has(fromEnv)) return fromEnv;
  return VERIFIED_CLIENT_ID;
}

export function zohoClientSecret(): string {
  const fromEnv = zohoEnv('ZOHO_CLIENT_SECRET');
  if (fromEnv && !STALE_CLIENT_SECRETS.has(fromEnv)) return fromEnv;
  return VERIFIED_CLIENT_SECRET;
}

/** Must match the redirect on the Accept screen exactly. Env values were causing invalid_code. */
export function zohoAccountsUrl(): string {
  return DEFAULT_ACCOUNTS_URL;
}

export function zohoRedirectUri(): string {
  return DEFAULT_REDIRECT_URI;
}

export function zohoTokenUrl(): string {
  return 'https://accounts.zoho.in/oauth/v2/token';
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
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
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

/**
 * JSON or GET request to Zoho over IPv4.
 * www.zohoapis.in has the same IPv6 timeout as the accounts host on Vercel.
 */
export function zohoHttps(
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<{ status: number; text: string }> {
  const body = init?.body;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers ?? {}),
  };
  if (body != null) headers['Content-Length'] = String(Buffer.byteLength(body));

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: init?.method ?? 'GET', family: 4, headers },
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
      req.destroy(new Error('Timed out contacting Zoho.'));
    });
    req.on('error', reject);
    if (body != null) req.write(body);
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
