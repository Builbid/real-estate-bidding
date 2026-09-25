import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadMistriThumbRulesProject } from '@/lib/contract/loadMistriThumbRules';
import {
  generateMistriThumbRulesPdfBytes,
  mistriThumbRulesFileName,
} from '@/lib/contract/mistriThumbRulesPdf';

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

  const loaded = await loadMistriThumbRulesProject(projectId, user.id);
  if ('error' in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const bytes = generateMistriThumbRulesPdfBytes(loaded.project);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${mistriThumbRulesFileName(projectId, loaded.project.numeric_id)}"`,
    },
  });
}
