import { NextResponse } from 'next/server';
import { selectBuilderAction } from '@/app/actions/select';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function asId(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
  return trimmed;
}

export async function POST(request: Request) {
  let body: {
    projectId?: unknown;
    project_id?: unknown;
    builderId?: unknown;
    builder_id?: unknown;
    builderName?: unknown;
    packageId?: unknown;
    package_id?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.', success: false }, { status: 400 });
  }

  const projectId = asId(body.projectId ?? body.project_id);
  const builderId = asId(body.builderId ?? body.builder_id);
  const builderName = typeof body.builderName === 'string' ? body.builderName : undefined;
  const packageId = asId(body.packageId ?? body.package_id) || undefined;

  if (!projectId || !builderId) {
    return NextResponse.json(
      { error: 'Project or builder is missing. Refresh the page and try again.', success: false },
      { status: 400 },
    );
  }

  const result = await selectBuilderAction(projectId, builderId, builderName, packageId);
  if (result.error) {
    return NextResponse.json({ error: result.error, success: false }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    success: true,
    message: 'Builder Selected Successfully',
  });
}
