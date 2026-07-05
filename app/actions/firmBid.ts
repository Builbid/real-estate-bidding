'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseBidDbError, validateSingleRate } from '@/lib/validation/singleRate';

export async function submitFirmBidAction(
  projectId: string,
  singleRate: number,
  bidId?: string | null,
): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to submit a bid.', success: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, service_type')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'construction_firm' || profile?.service_type !== 'construction_firm') {
    return { error: 'You are not authorized to bid on this project type.', success: false };
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('service_type')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { error: 'Project not found.', success: false };
  }

  if (project.service_type !== 'construction_firm') {
    return { error: 'You are not authorized to bid on this project type.', success: false };
  }

  const validation = validateSingleRate(singleRate);
  if (!validation.valid) {
    return { error: validation.message ?? 'Invalid bid rate.', success: false };
  }

  const ratesPayload = { ground_rate: singleRate };

  if (bidId) {
    const { error: updateError } = await supabase
      .from('bids')
      .update({
        rates: ratesPayload,
        single_rate: singleRate,
        service_type: 'construction_firm',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidId)
      .eq('builder_id', user.id);

    if (updateError) {
      return { error: parseBidDbError(updateError.message), success: false };
    }
  } else {
    const { error: insertError } = await supabase.from('bids').insert({
      project_id: projectId,
      builder_id: user.id,
      rates: ratesPayload,
      single_rate: singleRate,
      service_type: 'construction_firm',
      is_withdrawn: false,
    });

    if (insertError) {
      return { error: parseBidDbError(insertError.message), success: false };
    }
  }

  revalidatePath('/dashboard/firm');
  revalidatePath(`/dashboard/firm/bid/${projectId}`);

  return { error: null, success: true };
}
