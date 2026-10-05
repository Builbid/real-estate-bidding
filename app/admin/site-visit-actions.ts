'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import {
  parseSiteVisitInput,
  type SiteVisitInput,
  type SiteVisitRecord,
} from '@/lib/admin/siteVisit';
import {
  isMissingWorkflowTable,
  loadSiteVisit,
  SITE_VISIT_TABLE_MISSING_MESSAGE,
} from '@/lib/admin/siteVisitStore';
import {
  buildMeasurementTemplate,
  computeMeasuredCost,
  type MeasurementTemplate,
} from '@/lib/admin/siteMeasurements';
import type { BidRates } from '@/lib/types';
import { finalizeApprovedAgreement } from '@/lib/admin/agreementPackage';
import { projectTerritoryError } from '@/lib/admin/territory';
import { PROTOTYPE_AUTO_AGREEMENT } from '@/lib/admin/prototype';
import { findProjectByAnyId } from '@/lib/contract/resolveProjectId';
import type { DigitalContractRecord } from '@/lib/contract/renderDigitalContract';

function todayIst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

async function resolveAssignedProject(projectRef: string, session: { userId: string; email: string }) {
  const admin = createAdminClient();
  const { data: project } = await findProjectByAnyId<{
    id: string;
    status: string;
    selected_builder_id: string | null;
  }>(admin, projectRef, 'id, status, selected_builder_id');
  if (!project) return { error: 'Project not found.' as const };
  const territoryError = await projectTerritoryError(admin, session, project.id);
  if (territoryError) return { error: territoryError as string };
  if (!project.selected_builder_id) {
    // Prototype testing: a closed project with bids is auto-awarded to its lowest bidder
    // the first time the supervisor works on it (no separate accept / company step).
    const awarded = PROTOTYPE_AUTO_AGREEMENT
      ? await awardLowestBidder(admin, project.id, project.status)
      : null;
    if (!awarded || 'error' in awarded) {
      return {
        error:
          (awarded && 'error' in awarded ? awarded.error : null) ??
          ('A site visit can be recorded only after a Mistri / contractor is finalized for this project.' as const),
      };
    }
    return { admin, project: { ...project, selected_builder_id: awarded.builderId } };
  }
  return { admin, project };
}

/** Awards the lowest active bid. Guarded so a concurrent owner award is never overwritten. */
async function awardLowestBidder(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  status: string,
): Promise<{ builderId: string } | { error: string }> {
  if (status === 'cancelled') return { error: 'This project was cancelled.' };
  const { data: bid } = await admin
    .from('bids')
    .select('builder_id')
    .eq('project_id', projectId)
    .eq('is_withdrawn', false)
    .order('total_sum_metric', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!bid?.builder_id) return { error: 'This project has no active bids to award.' };

  const { error } = await admin
    .from('projects')
    .update({ selected_builder_id: bid.builder_id, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .is('selected_builder_id', null);
  if (error) return { error: error.message };

  // Re-read in case an owner award won the race.
  const { data: fresh } = await admin
    .from('projects')
    .select('selected_builder_id')
    .eq('id', projectId)
    .maybeSingle();
  return { builderId: (fresh?.selected_builder_id as string | null) ?? bid.builder_id };
}

async function isAlreadyApproved(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
): Promise<boolean> {
  const { data } = await admin
    .from('project_digital_contracts')
    .select('approved_at')
    .eq('project_id', projectId)
    .maybeSingle();
  return Boolean(data?.approved_at);
}

/**
 * Builds the trade-specific measurement template (owner-submitted specs copied verbatim +
 * the measurable lines priced at the winning bid's rates) for a project.
 */
async function loadMeasurementTemplate(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  builderId: string | null,
): Promise<{ template: MeasurementTemplate; defaultFloors: number }> {
  const { data: project } = await admin.from('projects').select('*').eq('id', projectId).maybeSingle();
  let rates: BidRates | null = null;
  if (builderId) {
    const { data: bid } = await admin
      .from('bids')
      .select('rates')
      .eq('project_id', projectId)
      .eq('builder_id', builderId)
      .eq('is_withdrawn', false)
      .limit(1)
      .maybeSingle();
    rates = (bid?.rates as BidRates | null | undefined) ?? null;
  }
  const floors = Number(project?.total_floors);
  return {
    template: buildMeasurementTemplate(project ?? {}, rates),
    defaultFloors: Number.isFinite(floors) && floors >= 1 ? Math.min(20, Math.trunc(floors)) : 1,
  };
}

export interface ChecklistProjectSummary {
  id: string;
  publicId: string;
  title: string;
  clientName: string;
  district: string;
}

export async function loadSiteVisitAction(projectRef: string): Promise<{
  visit: SiteVisitRecord | null;
  template: MeasurementTemplate | null;
  defaultFloors: number;
  error?: string;
  project: ChecklistProjectSummary | null;
}> {
  const session = await requireOfficialAdmin();
  const resolved = await resolveAssignedProject(projectRef, session);
  if ('error' in resolved) {
    return { visit: null, template: null, defaultFloors: 1, error: resolved.error, project: null };
  }
  const [visit, context, display] = await Promise.all([
    loadSiteVisit(resolved.admin, resolved.project.id),
    loadMeasurementTemplate(resolved.admin, resolved.project.id, resolved.project.selected_builder_id),
    resolved.admin
      .from('projects')
      .select('id, title, numeric_id, district, owner_id')
      .eq('id', resolved.project.id)
      .maybeSingle(),
  ]);
  const ownerId = (display.data?.owner_id as string | undefined) ?? '';
  const { data: owner } = ownerId
    ? await resolved.admin.from('profiles').select('full_name').eq('id', ownerId).maybeSingle()
    : { data: null };
  return {
    visit,
    template: context.template,
    defaultFloors: context.defaultFloors,
    project: {
      id: resolved.project.id,
      publicId: String(display.data?.numeric_id ?? '').trim().toUpperCase(),
      title: String(display.data?.title ?? 'Project'),
      clientName: owner?.full_name?.trim() || 'Homeowner',
      district: String(display.data?.district ?? ''),
    },
  };
}

export async function saveSiteVisitChecklistAction(
  projectRef: string,
  input: SiteVisitInput,
): Promise<{
  error?: string;
  ok?: boolean;
  plinthAreaSqft?: number;
  totalAccurateCost?: number | null;
}> {
  const session = await requireOfficialAdmin();

  const resolved = await resolveAssignedProject(projectRef, session);
  if ('error' in resolved) return { error: resolved.error };
  const { admin, project } = resolved;

  // The measurement lines (and their agreed rates) always come from the server, never the client.
  const { template } = await loadMeasurementTemplate(admin, project.id, project.selected_builder_id);

  const parsed = parseSiteVisitInput(input, todayIst(), { requirePlot: template.needsPlotDimensions });
  if ('error' in parsed) return { error: parsed.error };

  const measurements: Record<string, string> = {};
  for (const line of template.lines) measurements[line.id] = String(input.measurements?.[line.id] ?? '').trim();
  const cost = computeMeasuredCost(template.lines, measurements);
  const totalAccurateCost = template.lines.length > 0 ? cost.total : null;

  if (await isAlreadyApproved(admin, project.id)) {
    return { error: 'This agreement is already approved. The site checklist is locked.' };
  }

  const v = parsed.value;
  const now = new Date().toISOString();
  const { error } = await admin.from('project_site_visits').upsert(
    {
      project_id: project.id,
      supervisor_id: session.userId,
      visit_date: v.visitDate,
      plot_length_ft: v.plotLengthFt > 0 ? v.plotLengthFt : null,
      plot_width_ft: v.plotWidthFt > 0 ? v.plotWidthFt : null,
      plinth_area_sqft: v.plinthAreaSqft > 0 ? v.plinthAreaSqft : null,
      floors: v.floors,
      soil_type: v.soilType,
      road_width_ft: v.roadWidthFt,
      water_available: false,
      electricity_available: false,
      storage_available: false,
      site_notes: v.siteNotes || null,
      agreed_start_date: v.agreedStartDate,
      target_completion_date: v.targetCompletionDate,
      trade_key: template.tradeKey,
      measurements,
      line_items: cost.items,
      total_accurate_cost: totalAccurateCost,
      updated_at: now,
    },
    { onConflict: 'project_id' },
  );

  if (error) {
    if (isMissingWorkflowTable(error)) return { error: SITE_VISIT_TABLE_MISSING_MESSAGE };
    return { error: error.message };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/dashboard/checklist/${project.id}`);
  revalidatePath(`/admin/agreement/${project.id}`);
  return { ok: true, plinthAreaSqft: v.plinthAreaSqft, totalAccurateCost };
}

/**
 * "Go to Agreement": confirms the checklist exists, then opens the two-party digital agreement.
 * The agreement page auto-populates from the project, winning bid and checklist.
 */
export async function goToAgreementAction(
  projectRef: string,
): Promise<{ error?: string; ok?: boolean; href?: string }> {
  const session = await requireOfficialAdmin();
  const resolved = await resolveAssignedProject(projectRef, session);
  if ('error' in resolved) return { error: resolved.error };
  const { admin, project } = resolved;

  const visit = await loadSiteVisit(admin, project.id);
  if (!visit) {
    // Prototype testing: the agreement opens without a saved checklist.
    if (PROTOTYPE_AUTO_AGREEMENT) return { ok: true, href: `/admin/agreement/${project.id}` };
    return { error: 'Save the Site Visit Checklist before opening the agreement.' };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('project_site_visits')
    .update({ agreement_started_at: now, updated_at: now })
    .eq('project_id', project.id);
  if (error && !isMissingWorkflowTable(error)) return { error: error.message };

  return { ok: true, href: `/admin/agreement/${project.id}` };
}

/** Retry the final PDF dispatch / approval / commission when a previous attempt failed. */
export async function retryApprovalDispatchAction(
  projectRef: string,
): Promise<{ error?: string; ok?: boolean; message?: string }> {
  const session = await requireOfficialAdmin();
  const resolved = await resolveAssignedProject(projectRef, session);
  if ('error' in resolved) return { error: resolved.error };
  const { admin, project } = resolved;

  const { data } = await admin
    .from('project_digital_contracts')
    .select('*')
    .eq('project_id', project.id)
    .maybeSingle();
  const contract = data as DigitalContractRecord | null;
  if (!contract) return { error: 'No agreement has been sent for signature yet.' };
  if (contract.status !== 'signed') {
    return { error: 'Both parties must complete Aadhaar OTP eSign before final approval.' };
  }

  const result = await finalizeApprovedAgreement(contract);
  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/agreement/${project.id}`);
  if (!result.approved) {
    return { error: result.warning ?? 'Final dispatch failed. Please retry.' };
  }
  return {
    ok: true,
    message: result.warning
      ? `Approved and dispatched. ${result.warning}`
      : 'Approved / Active. Signed PDFs sent to the Home Owner and the Mistri.',
  };
}
