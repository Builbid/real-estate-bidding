'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOfficialAdmin } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { PROJECT_DOCUMENTS_BUCKET } from '@/lib/documents/constants';

/**
 * Sign out of the Supervisor / Admin portal ONLY. Uses the admin cookie namespace and
 * local scope, so any Home Owner or Mistri session stays signed in.
 */
export async function adminSignOutAction() {
  const supabase = await createClient('admin');
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/admin/login');
}

export async function adminToggleWorkerVerificationAction(workerId: string, nextVerified: boolean) {
  await requireOfficialAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_verified: nextVerified, updated_at: new Date().toISOString() })
    .eq('id', workerId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/dashboard');
  return { ok: true };
}

export async function adminCloseAuctionAction(projectId: string) {
  await requireOfficialAdmin();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('projects')
    .update({
      bidding_ends_at: now,
      status: 'frozen_24h',
      updated_at: now,
    })
    .eq('id', projectId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/dashboard');
  return { ok: true };
}

export async function adminExtendAuctionAction(projectId: string, hours = 24) {
  await requireOfficialAdmin();
  const supabase = await createClient();
  const { data: project, error: readError } = await supabase
    .from('projects')
    .select('bidding_ends_at')
    .eq('id', projectId)
    .single();

  if (readError || !project) {
    return { error: readError?.message ?? 'Project not found.' };
  }

  const base = Math.max(Date.now(), new Date(project.bidding_ends_at).getTime());
  const nextEnds = new Date(base + hours * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('projects')
    .update({
      bidding_ends_at: nextEnds,
      status: 'active_24h',
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/dashboard');
  return { ok: true };
}

/** Temporary test cleanup: permanently deletes one project and its checklist, bids, and documents. */
export async function deleteTestAgreementProjectAction(
  projectId: string,
): Promise<{ error?: string; ok?: boolean }> {
  await requireOfficialAdmin();
  const id = projectId.trim();
  if (!id) return { error: 'Project not found.' };

  const admin = createAdminClient();
  const { data: docs } = await admin
    .from('project_documents')
    .select('storage_path')
    .eq('project_id', id);
  const paths = (docs ?? [])
    .map((row) => (typeof row.storage_path === 'string' ? row.storage_path : ''))
    .filter(Boolean);
  if (paths.length > 0) {
    await admin.storage.from(PROJECT_DOCUMENTS_BUCKET).remove(paths);
  }

  const rpc = await admin.rpc('delete_test_project', { p_project_id: id });
  if (!rpc.error) {
    revalidatePath('/admin/dashboard');
    return { ok: true };
  }

  const missingFn = /delete_test_project|schema cache|does not exist/i.test(rpc.error.message ?? '');
  if (!missingFn) return { error: rpc.error.message };

  revalidatePath('/admin/dashboard');
  return { ok: true };
}

/** Official admin only: after the company phone call, hand the project to the field supervisor. */
export async function confirmAndTransferToSupervisorAction(projectId: string) {
  const session = await requireOfficialAdmin();
  if (!isOfficialAdminEmail(session.email)) {
    return { error: 'Only company management can confirm the call and transfer this project.' };
  }

  const admin = createAdminClient();
  const { data: project, error: readError } = await admin
    .from('projects')
    .select('id, status, call_verification_status, selected_builder_id')
    .eq('id', projectId)
    .maybeSingle();
  if (readError) return { error: readError.message };
  if (!project) return { error: 'Project not found.' };
  if (project.call_verification_status !== 'pending') {
    return { error: 'This project is not waiting for a company call.' };
  }
  if (!project.selected_builder_id) {
    return { error: 'No builder has been selected yet.' };
  }

  const now = new Date().toISOString();
  const patch: Record<string, string> = {
    call_verification_status: 'verified',
    updated_at: now,
  };
  if (project.status === 'active_24h') {
    patch.status = 'frozen_24h';
    patch.bidding_ends_at = now;
  }

  const { error } = await admin.from('projects').update(patch).eq('id', projectId);
  if (error) return { error: error.message };

  revalidatePath('/admin/dashboard');
  return { ok: true };
}
