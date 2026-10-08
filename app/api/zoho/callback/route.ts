import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://accounts.zoho.in/oauth/v2/token';
const REDIRECT_URI = 'https://builbid.in/api/zoho/callback';

type ZohoTokenPayload = {
  access_token?: string;
  refresh_token?: string;
  api_domain?: string;
  expires_in?: number;
  error?: string;
};

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code');
  if (!code) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing authorization code. Zoho did not return a code parameter.',
      },
      { status: 400 },
    );
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { ok: false, error: 'Zoho client credentials are not configured on the server.' },
      { status: 500 },
    );
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    code,
  });

  let payload: ZohoTokenPayload;
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });
    payload = (await response.json()) as ZohoTokenPayload;
    if (!response.ok || payload.error) {
      const message = payload.error || 'Zoho token exchange failed.';
      console.error('[zoho-oauth] token exchange failed', {
        status: response.status,
        error: message,
      });
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  } catch (err) {
    console.error('[zoho-oauth] token exchange request failed', err);
    return NextResponse.json(
      { ok: false, error: 'Could not reach Zoho to exchange the authorization code.' },
      { status: 502 },
    );
  }

  if (!payload.access_token) {
    return NextResponse.json(
      { ok: false, error: 'Zoho did not return an access token.' },
      { status: 502 },
    );
  }

  // Server log only, for the one-time refresh-token setup. Not sent to the browser.
  console.info('[zoho-oauth] tokens received', {
    refresh_token: payload.refresh_token ?? null,
    access_token: payload.access_token,
    api_domain: payload.api_domain ?? null,
  });

  return NextResponse.json({
    ok: true,
    message: 'Zoho authentication succeeded.',
    api_domain: payload.api_domain ?? null,
    expires_in: payload.expires_in ?? null,
  });
}
