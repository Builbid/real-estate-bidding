import { NextResponse } from 'next/server';
import { getProjectDocumentDownloadUrl } from '@/app/actions/documents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim() ?? '';
  if (!id) {
    return NextResponse.json({ error: 'Document id is required.' }, { status: 400 });
  }

  const disposition = url.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
  const result = await getProjectDocumentDownloadUrl(id, disposition);
  if (result.error || !result.url) {
    return NextResponse.json({ error: result.error || 'Could not open this file.' }, { status: 404 });
  }

  return NextResponse.redirect(result.url);
}
