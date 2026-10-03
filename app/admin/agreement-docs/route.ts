import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStaffSession } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { loadAgreementDraft } from '@/lib/admin/agreementDraft';
import { buildThumbRulePdf } from '@/lib/admin/agreementPackage';
import {
  generateDigitalContractPdf,
  overlayFromFields,
} from '@/lib/contract/renderDigitalContract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Staff-only document preview for the Agreement workspace.
 *   ?projectId=<uuid|public id>&kind=agreement  -> auto-populated draft agreement PDF
 *   ?projectId=<uuid|public id>&kind=thumb      -> Mistri Thumb Rule instruction sheet PDF
 */
export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const projectRef = params.get('projectId')?.trim() ?? '';
  const kind = params.get('kind') === 'thumb' ? 'thumb' : 'agreement';
  if (!projectRef) {
    return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const draft = await loadAgreementDraft(admin, projectRef);
  if ('error' in draft) {
    return NextResponse.json({ error: draft.error }, { status: 404 });
  }
  if (!draft.visit && !isOfficialAdminEmail(session.email)) {
    // Supervisors work from the checklist; without it there is nothing to populate.
    return NextResponse.json(
      { error: 'Save the Site Visit Checklist first.' },
      { status: 409 },
    );
  }

  try {
    if (kind === 'thumb') {
      const pdf = await buildThumbRulePdf(admin, draft.project.id, draft.visit);
      if (!pdf) {
        return NextResponse.json(
          { error: 'Thumb rules are available for Mistri / civil work projects only.' },
          { status: 400 },
        );
      }
      return new NextResponse(Buffer.from(pdf.bytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${pdf.filename}"`,
        },
      });
    }

    const { plinthAreaSqft, totalCost, startDate, completionDate } = draft.defaults;
    const overlay = overlayFromFields({
      plinthAreaSqft: plinthAreaSqft ?? 0,
      totalAgreedCost: totalCost ?? 0,
      startDate,
      completionDate: completionDate || startDate,
    });
    const generated = await generateDigitalContractPdf(draft.project.id, overlay);
    return new NextResponse(Buffer.from(generated.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="DRAFT-${generated.filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not generate the document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
