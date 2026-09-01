import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadMistriAgreementPayload } from '@/lib/contract/loadMistriAgreement';
import { sendOfficialMistriAgreementEmail } from '@/lib/email/sendMistriAgreement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let projectId = '';
  try {
    const body = (await request.json()) as { projectId?: string };
    projectId = body.projectId?.trim() ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
  }

  const loaded = await loadMistriAgreementPayload(projectId, user.id);
  if ('error' in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  try {
    await sendOfficialMistriAgreementEmail(loaded.payload);
  } catch (err) {
    console.error('Official mistri agreement email failed:', err);
    return NextResponse.json(
      { error: 'Agreement generated but email dispatch failed. Check mail credentials.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    projectId,
    recipients: ['official@builbid.in', 'contact@builbid.in'],
  });
}
