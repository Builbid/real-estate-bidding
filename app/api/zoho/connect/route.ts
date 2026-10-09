import { NextResponse } from 'next/server';
import { zohoAuthorizeUrl } from '@/lib/zohoConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.redirect(zohoAuthorizeUrl(), 302);
}
