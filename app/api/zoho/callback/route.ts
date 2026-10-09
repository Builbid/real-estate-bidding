import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { postZohoForm, zohoClientId, zohoClientSecret, zohoRedirectUri, zohoTokenUrl } from '@/lib/zohoConfig';

export const dynamic = 'force-dynamic';

type ZohoTokenPayload = {
  access_token?: string;
  refresh_token?: string;
  api_domain?: string;
  expires_in?: number;
  error?: string;
};

async function persistRefreshToken(refreshToken: string, apiDomain: string | null): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('zoho_oauth').upsert(
      {
        id: 'default',
        refresh_token: refreshToken,
        api_domain: apiDomain,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) {
      console.error('[zoho-oauth] could not store refresh token', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[zoho-oauth] could not store refresh token', err);
    return false;
  }
}

const exchanges = new Map<string, ReturnType<typeof exchangeCodeOnce>>();

function exchangeCode(code: string) {
  const existing = exchanges.get(code);
  if (existing) return existing;
  const pending = exchangeCodeOnce(code);
  exchanges.set(code, pending);
  return pending;
}

async function exchangeCodeOnce(code: string) {
  const clientId = zohoClientId();
  const clientSecret = zohoClientSecret();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { success: false, error: 'Zoho client credentials are not configured on the server.' },
      { status: 500 },
    );
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: zohoRedirectUri(),
    code,
  });

  let payload: ZohoTokenPayload;
  try {
    const response = await postZohoForm(zohoTokenUrl(), body);
    payload = response.text ? (JSON.parse(response.text) as ZohoTokenPayload) : {};
    if (response.status < 200 || response.status >= 300 || payload.error) {
      const zohoError = payload.error || 'Zoho token exchange failed.';
      const message =
        zohoError === 'invalid_code'
          ? 'Zoho rejected this authorization code. Codes work only once and expire within a few minutes. Open /api/zoho/connect again and accept access. Do not refresh this page.'
          : zohoError;
      console.error('[zoho-oauth] token exchange failed', {
        status: response.status,
        error: zohoError,
      });
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown network error';
    console.error('[zoho-oauth] token exchange request failed', detail);
    return NextResponse.json(
      { success: false, error: `Could not reach Zoho to exchange the authorization code. ${detail}` },
      { status: 502 },
    );
  }

  if (!payload.refresh_token) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Zoho did not return a refresh token. Open /api/zoho/connect again and accept offline access.',
      },
      { status: 502 },
    );
  }

  const persisted = await persistRefreshToken(payload.refresh_token, payload.api_domain ?? null);
  console.info('[zoho-oauth] refresh token received', {
    persisted,
    api_domain: payload.api_domain ?? null,
  });

  return NextResponse.json({
    success: true,
    refresh_token: payload.refresh_token,
    message: 'Zoho CRM connected successfully!',
    persisted,
  });
}

export async function GET(request: NextRequest) {
  const oauthError = request.nextUrl.searchParams.get('error')?.trim() ?? '';
  if (oauthError) {
    return NextResponse.json(
      { success: false, error: oauthError, message: 'Zoho did not grant access.' },
      { status: 400 },
    );
  }

  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Missing authorization code. Zoho did not return a code parameter.' },
      { status: 400 },
    );
  }

  return exchangeCode(code);
}
