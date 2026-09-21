import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadMistriAgreementPayload } from '@/lib/contract/loadMistriAgreement';
import { loadPlumberAgreementPayload } from '@/lib/contract/loadPlumberAgreement';
import { loadElectricianAgreementPayload } from '@/lib/contract/loadElectricianAgreement';
import { loadPainterAgreementPayload } from '@/lib/contract/loadPainterAgreement';
import { sendOfficialMistriAgreementEmail, getOfficialAgreementRecipients } from '@/lib/email/sendMistriAgreement';
import { sendOfficialPlumberAgreementEmail } from '@/lib/email/sendPlumberAgreement';
import { sendOfficialElectricianAgreementEmail } from '@/lib/email/sendElectricianAgreement';
import { sendOfficialPainterAgreementEmail } from '@/lib/email/sendPainterAgreement';
import { isMistriCivilService } from '@/lib/contract/mistriAgreement';
import { isPlumberService } from '@/lib/contract/plumberAgreement';
import { isElectricianService } from '@/lib/contract/electricianAgreement';
import { isPainterService } from '@/lib/contract/painterAgreement';
import {
  createAgreementLookupClient,
  extractProjectIdFromRequest,
  findProjectByAnyId,
} from '@/lib/contract/resolveProjectId';

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

  const requestedId = await extractProjectIdFromRequest(request);
  if (!requestedId) {
    console.error(
      '[agreements/send-email] projectId missing from payload. Expected projectId, id, or project_id.',
    );
    return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
  }

  const db = await createAgreementLookupClient(user.email);
  const { data: project, errorMessage } = await findProjectByAnyId<{
    id: string;
    service_type: string | null;
  }>(db, requestedId, 'id, service_type');

  if (!project) {
    console.error('[agreements/send-email] Project lookup failed.', {
      requestedId,
      errorMessage,
    });
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const projectId = project.id;

  try {
    if (isPlumberService(project.service_type)) {
      const loaded = await loadPlumberAgreementPayload(projectId, user.id);
      if ('error' in loaded) {
        return NextResponse.json({ error: loaded.error }, { status: loaded.status });
      }
      await sendOfficialPlumberAgreementEmail(loaded.payload);
    } else if (isElectricianService(project.service_type)) {
      const loaded = await loadElectricianAgreementPayload(projectId, user.id);
      if ('error' in loaded) {
        return NextResponse.json({ error: loaded.error }, { status: loaded.status });
      }
      await sendOfficialElectricianAgreementEmail(loaded.payload);
    } else if (isPainterService(project.service_type)) {
      const loaded = await loadPainterAgreementPayload(projectId, user.id);
      if ('error' in loaded) {
        return NextResponse.json({ error: loaded.error }, { status: loaded.status });
      }
      await sendOfficialPainterAgreementEmail(loaded.payload);
    } else if (!project.service_type || isMistriCivilService(project.service_type)) {
      const loaded = await loadMistriAgreementPayload(projectId, user.id);
      if ('error' in loaded) {
        return NextResponse.json({ error: loaded.error }, { status: loaded.status });
      }
      await sendOfficialMistriAgreementEmail(loaded.payload);
    } else {
      return NextResponse.json(
        { error: 'Official agreements of this type are not available for this service.' },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error('Official agreement email failed:', err);
    return NextResponse.json(
      { error: 'Agreement generated but email dispatch failed. Check mail credentials.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    projectId,
    recipients: getOfficialAgreementRecipients(),
  });
}
