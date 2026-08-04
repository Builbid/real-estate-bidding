'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { normalizeConstructionPackages } from '@/lib/firm/constructionClass';
import { parseBidDbError, validateSingleRate } from '@/lib/validation/singleRate';
import { roundBidRateToNearestFive } from '@/lib/validation/bidRates';
import type { FirmConstructionPackage } from '@/lib/types';

export interface PackageRateInput {
  package_id: string;
  rate: number;
}

export async function submitFirmBidAction(
  projectId: string,
  packageRates: PackageRateInput[],
  bidId?: string | null,
): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to submit a bid.', success: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, service_type, construction_class_packages')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'construction_firm' || profile?.service_type !== 'construction_firm') {
    return { error: 'You are not authorized to bid on this project type.', success: false };
  }

  const packages = normalizeConstructionPackages(profile.construction_class_packages);
  if (!packages || packages.length === 0) {
    return {
      error: 'Add your construction packages in Firm Settings before placing a bid.',
      success: false,
    };
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

  const rateByPackageId = new Map(packageRates.map((r) => [r.package_id, r.rate]));

  const packageRatesPayload: { rate: number; package: FirmConstructionPackage }[] = [];
  for (const pkg of packages) {
    const rate = rateByPackageId.get(pkg.id);
    const validation = validateSingleRate(rate);
    if (!validation.valid) {
      return {
        error: `"${pkg.name}": ${validation.message ?? 'Enter a valid rate per sqft.'}`,
        success: false,
      };
    }
    packageRatesPayload.push({ rate: rate as number, package: pkg });
  }

  const average =
    packageRatesPayload.reduce((sum, p) => sum + p.rate, 0) / packageRatesPayload.length;
  const rankingRate = roundBidRateToNearestFive(average);

  const ratesPayload = { ground_rate: rankingRate };

  if (bidId) {
    const { error: updateError } = await supabase
      .from('bids')
      .update({
        rates: ratesPayload,
        single_rate: rankingRate,
        package_rates: packageRatesPayload,
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
      single_rate: rankingRate,
      package_rates: packageRatesPayload,
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
