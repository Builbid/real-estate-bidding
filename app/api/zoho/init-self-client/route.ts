import { NextRequest, NextResponse } from 'next/server';
import { postZohoForm, zohoClientId, zohoClientSecret, zohoTokenUrl } from '@/lib/zohoConfig';

export const dynamic = 'force-dynamic';

type ZohoTokenPayload = {
  refresh_token?: string;
  access_token?: string;
  api_domain?: string;
  expires_in?: number;
  error?: string;
};

/**
 * One-time Self Client exchange. No redirect_uri: Zoho rejects Self Client
 * codes when a redirect is included.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Add the Self Client grant code as ?code=...' },
      { status: 400 },
    );
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: zohoClientId(),
    client_secret: zohoClientSecret(),
    code,
  });

  try {
    const response = await postZohoForm(zohoTokenUrl(), body);
    const payload: ZohoTokenPayload = response.text ? (JSON.parse(response.text) as ZohoTokenPayload) : {};
    if (response.status < 200 || response.status >= 300 || payload.error || !payload.refresh_token) {
      const zohoError = payload.error || 'Zoho did not return a refresh token.';
      console.error('[zoho-self-client] token exchange failed', {
        status: response.status,
        error: zohoError,
      });
      return NextResponse.json({ success: false, error: zohoError }, { status: 400 });
    }

    console.info('[zoho-self-client] refresh token received', {
      api_domain: payload.api_domain ?? null,
    });

    return NextResponse.json({
      success: true,
      refresh_token: payload.refresh_token,
      api_domain: payload.api_domain ?? null,
      expires_in: payload.expires_in ?? null,
      message: 'Zoho CRM connected successfully!',
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown network error';
    console.error('[zoho-self-client] token exchange request failed', detail);
    return NextResponse.json(
      { success: false, error: `Could not reach Zoho. ${detail}` },
      { status: 502 },
    );
  }
}
