import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadMistriAgreementPayload } from '@/lib/contract/loadMistriAgreement';
import { loadPlumberAgreementPayload } from '@/lib/contract/loadPlumberAgreement';
import { loadElectricianAgreementPayload } from '@/lib/contract/loadElectricianAgreement';
import { loadPainterAgreementPayload } from '@/lib/contract/loadPainterAgreement';
import {
  generateMistriAgreementPdfBytes,
  isMistriCivilService,
  mistriAgreementFileName,
} from '@/lib/contract/mistriAgreement';
import {
  generatePlumberAgreementPdfBytes,
  isPlumberService,
  plumberAgreementFileName,
} from '@/lib/contract/plumberAgreement';
import {
  generateElectricianAgreementPdfBytes,
  isElectricianService,
  electricianAgreementFileName,
} from '@/lib/contract/electricianAgreement';
import {
  generatePainterAgreementPdfBytes,
  isPainterService,
  painterAgreementFileName,
} from '@/lib/contract/painterAgreement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get('projectId')?.trim() ?? '';
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('service_type')
    .eq('id', projectId)
    .maybeSingle();

  if (isPlumberService(project?.service_type)) {
    const loaded = await loadPlumberAgreementPayload(projectId, user.id);
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    }
    const bytes = generatePlumberAgreementPdfBytes(loaded.payload);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${plumberAgreementFileName(projectId, loaded.payload.numericProjectId)}"`,
      },
    });
  }

  if (isElectricianService(project?.service_type)) {
    const loaded = await loadElectricianAgreementPayload(projectId, user.id);
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    }
    const bytes = generateElectricianAgreementPdfBytes(loaded.payload);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${electricianAgreementFileName(projectId, loaded.payload.numericProjectId)}"`,
      },
    });
  }

  if (isPainterService(project?.service_type)) {
    const loaded = await loadPainterAgreementPayload(projectId, user.id);
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    }
    const bytes = generatePainterAgreementPdfBytes(loaded.payload);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${painterAgreementFileName(projectId, loaded.payload.numericProjectId)}"`,
      },
    });
  }

  if (project && !isMistriCivilService(project.service_type)) {
    return NextResponse.json(
      { error: 'Official agreements of this type are not available for this service.' },
      { status: 400 },
    );
  }

  const loaded = await loadMistriAgreementPayload(projectId, user.id);
  if ('error' in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const bytes = generateMistriAgreementPdfBytes(loaded.payload);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${mistriAgreementFileName(projectId, loaded.payload.numericProjectId)}"`,
    },
  });
}
