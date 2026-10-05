import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadAgreementDraft } from '@/lib/admin/agreementDraft';
import { soilLabel } from '@/lib/admin/siteVisit';
import { tradeLabelFor } from '@/lib/admin/siteMeasurements';
import { projectTerritoryError } from '@/lib/admin/territory';
import { PROTOTYPE_AUTO_AGREEMENT } from '@/lib/admin/prototype';
import { AgreementWorkspace, type AgreementWorkspaceProps } from './AgreementWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminAgreementPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireOfficialAdmin();
  const { projectId } = await params;

  const admin = createAdminClient();
  const draft = await loadAgreementDraft(admin, decodeURIComponent(projectId));

  if ('error' in draft) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {draft.error}
        </p>
        <Link
          href="/admin/dashboard?tab=projects"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700"
        >
          â† Back to dashboard
        </Link>
      </main>
    );
  }

  // Supervisors can only open agreements for projects inside their pin code territory.
  const territoryError = await projectTerritoryError(admin, session, draft.project.id);
  if (territoryError) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {territoryError}
        </p>
        <Link
          href="/admin/dashboard?tab=projects"
          className="mt-4 inline-block text-sm font-semibold text-emerald-700"
        >
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  // Supervisors must complete the Site Visit Checklist before the agreement exists.
  if (!draft.visit && !isOfficialAdminEmail(session.email) && !PROTOTYPE_AUTO_AGREEMENT) {
    redirect('/admin/dashboard?tab=projects');
  }

  const contract = draft.contract;
  const visit = draft.visit;

  // When the supervisor last shared this agreement with the Home Owner and the Mistri / Worker.
  const { data: sharedRow } = await admin
    .from('shared_agreements')
    .select('shared_at')
    .eq('project_id', draft.project.id)
    .maybeSingle();
  const sharedAt = (sharedRow?.shared_at as string | undefined) ?? null;

  const props: AgreementWorkspaceProps = {
    project: draft.project,
    client: draft.client,
    contractor: draft.contractor,
    siteRows: visit
      ? [
          { label: 'Site visit date', value: visit.visitDate.split('-').reverse().join('/') },
          ...(visit.plotLengthFt > 0 && visit.plotWidthFt > 0
            ? [{ label: 'Plot (L x W)', value: `${visit.plotLengthFt} ft x ${visit.plotWidthFt} ft` }]
            : []),
          ...(visit.plinthAreaSqft > 0
            ? [{ label: 'Measured plinth area', value: `${visit.plinthAreaSqft.toLocaleString('en-IN')} sq. ft.` }]
            : []),
          { label: 'Soil condition', value: soilLabel(visit.soilType) },
          ...(visit.siteNotes ? [{ label: 'Field notes', value: visit.siteNotes }] : []),
        ]
      : [],
    valuesLocked:
      (Boolean(visit) || PROTOTYPE_AUTO_AGREEMENT) && !isOfficialAdminEmail(session.email),
    defaults: draft.defaults,
    tradeLabel: tradeLabelFor(draft.project.serviceType),
    lineItems: visit?.lineItems ?? [],
    sharedAt,
    contract: contract
      ? {
          status: contract.status,
          clientSigned: Boolean(contract.client_verified_at),
          contractorSigned: Boolean(contract.contractor_verified_at),
          approved: Boolean(contract.approved_at),
          approvedAt: contract.approved_at ?? null,
          otpExpiresAt: contract.otp_expires_at,
        }
      : null,
    commission: draft.commission,
  };

  return <AgreementWorkspace {...props} />;
}
