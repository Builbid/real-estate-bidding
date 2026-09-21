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
import {
  createAgreementLookupClient,
  extractProjectIdFromRequest,
  findProjectByAnyId,
} from '@/lib/contract/resolveProjectId';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveRequestedProject(request: Request, email?: string | null) {
  const requestedId = await extractProjectIdFromRequest(request);
  if (!requestedId) {
    console.error(
      '[agreements/pdf] projectId missing from query/body. Expected projectId, id, or project_id.',
    );
    return { error: NextResponse.json({ error: 'projectId is required.' }, { status: 400 }) };
  }

  const db = await createAgreementLookupClient(email);
  const { data: project, errorMessage } = await findProjectByAnyId<{
    id: string;
    service_type: string | null;
  }>(db, requestedId, 'id, service_type');

  if (!project) {
    console.error('[agreements/pdf] Project lookup failed.', { requestedId, errorMessage });
    return { error: NextResponse.json({ error: 'Project not found.' }, { status: 404 }) };
  }

  return { project, requestedId };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolved = await resolveRequestedProject(request, user.email);
  if ('error' in resolved && resolved.error) return resolved.error;
  const { project } = resolved as { project: { id: string; service_type: string | null } };
  const projectId = project.id;

  if (isPlumberService(project.service_type)) {
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

  if (isElectricianService(project.service_type)) {
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

  if (isPainterService(project.service_type)) {
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

  if (project.service_type && !isMistriCivilService(project.service_type)) {
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

export async function POST(request: Request) {
  return GET(request);
}
