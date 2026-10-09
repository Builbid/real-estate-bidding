import { NextResponse } from 'next/server';
import { zohoAuthorizeUrl, zohoEnv } from '@/lib/zohoConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!zohoEnv('ZOHO_CLIENT_ID')) {
    return NextResponse.json(
      { success: false, error: 'ZOHO_CLIENT_ID is not set.' },
      { status: 500 },
    );
  }

  return NextResponse.redirect(zohoAuthorizeUrl(), 302);
}
