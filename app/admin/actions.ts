'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireOfficialAdmin } from '@/lib/admin/auth';

export async function adminSignOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
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
