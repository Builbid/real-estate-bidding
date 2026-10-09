import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ZOHO_CONNECT_URL =
  'https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.leads.ALL,ZohoCRM.modules.notes.ALL&client_id=1000.96NFA79HWDAM3XHIO7MUS2PG9TBSOS&response_type=code&access_type=offline&prompt=consent&redirect_uri=https://builbid.in/api/zoho/callback';

export async function GET() {
  return NextResponse.redirect(ZOHO_CONNECT_URL, 302);
}
