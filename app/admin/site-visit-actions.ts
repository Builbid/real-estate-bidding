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
    selected_builder_id: string | null;
  }>(admin, projectRef, 'id, selected_builder_id');
  if (!project) return { error: 'Project not found.' as const };
  const territoryError = await projectTerritoryError(admin, session, project.id);
  if (territoryError) return { error: territoryError as string };
  if (!project.selected_builder_id) {
    return {
      error: 'A site visit can be recorded only after a Mistri / contractor is finalized for this project.' as const,
    };
  }
  return { admin, project };
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

export async function loadSiteVisitAction(
  projectRef: string,
): Promise<{ visit: SiteVisitRecord | null }> {
  const session = await requireOfficialAdmin();
  const resolved = await resolveAssignedProject(projectRef, session);
  if ('error' in resolved) return { visit: null };
  return { visit: await loadSiteVisit(resolved.admin, resolved.project.id) };
}

export async function saveSiteVisitChecklistAction(
  projectRef: string,
  input: SiteVisitInput,
): Promise<{ error?: string; ok?: boolean; plinthAreaSqft?: number }> {
  const session = await requireOfficialAdmin();

  const parsed = parseSiteVisitInput(input, todayIst());
  if ('error' in parsed) return { error: parsed.error };

  const resolved = await resolveAssignedProject(projectRef, session);
  if ('error' in resolved) return { error: resolved.error };
  const { admin, project } = resolved;

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
      plot_length_ft: v.plotLengthFt,
      plot_width_ft: v.plotWidthFt,
      plinth_area_sqft: v.plinthAreaSqft,
      floors: v.floors,
      soil_type: v.soilType,
      road_width_ft: v.roadWidthFt,
      water_available: v.waterAvailable,
      electricity_available: v.electricityAvailable,
      storage_available: v.storageAvailable,
      site_notes: v.siteNotes || null,
      updated_at: now,
    },
    { onConflict: 'project_id' },
  );

  if (error) {
    if (isMissingWorkflowTable(error)) return { error: SITE_VISIT_TABLE_MISSING_MESSAGE };
    return { error: error.message };
  }

  revalidatePath('/admin/dashboard');
  return { ok: true, plinthAreaSqft: v.plinthAreaSqft };
}

/**
 * "Go to Agreement": confirms the checklist exists, then stamps that the agreement draft and
 * Mistri Thumb Rule sheet were generated from it. The agreement page auto-populates from the
 * project, winning bid and checklist.
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
    .update({ agreement_started_at: now, thumb_rule_generated_at: now, updated_at: now })
    .eq('project_id', project.id);
  if (error && !isMissingWorkflowTable(error)) return { error: error.message };

  return { ok: true, href: `/admin/agreement/${project.id}` };
}

/**
 * Prototype "Receive / Accept Project": turns a closed project in the Agreements tab into an
 * awarded agreement. If no bidder has been formally awarded yet, the lowest active bid becomes
 * the awardee (no manual company-side step), then the agreement letter is opened.
 */
export async function acceptProjectAction(
  projectRef: string,
): Promise<{ error?: string; ok?: boolean; href?: string }> {
  const session = await requireOfficialAdmin();
  const admin = createAdminClient();
  const { data: project } = await findProjectByAnyId<{
    id: string;
    status: string;
    selected_builder_id: string | null;
  }>(admin, projectRef, 'id, status, selected_builder_id');
  if (!project) return { error: 'Project not found.' };
  const territoryError = await projectTerritoryError(admin, session, project.id);
  if (territoryError) return { error: territoryError };

  if (!project.selected_builder_id) {
    if (!PROTOTYPE_AUTO_AGREEMENT) {
      return { error: 'A Mistri / contractor must be finalized before the project can be accepted.' };
    }
    if (project.status === 'cancelled') return { error: 'This project was cancelled.' };

    const { data: bid } = await admin
      .from('bids')
      .select('builder_id')
      .eq('project_id', project.id)
      .eq('is_withdrawn', false)
      .order('total_sum_metric', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!bid?.builder_id) return { error: 'This project has no active bids to award.' };

    // Guarded so a concurrent owner award is never overwritten.
    const { error } = await admin
      .from('projects')
      .update({ selected_builder_id: bid.builder_id, updated_at: new Date().toISOString() })
      .eq('id', project.id)
      .is('selected_builder_id', null);
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/dashboard');
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
