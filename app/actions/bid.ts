'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  bidUnitForEarthworkMode,
  parseVehicleCapacity,
  resolveEarthworkBidMode,
} from '@/lib/bid/earthworkBid';
import { resolveProjectBidFloors } from '@/lib/bid/floorRateDisplay';
import { isDrawingDesignServiceType } from '@/lib/drawingDesign';
import { isTradeServiceType } from '@/lib/trades';
import type { BidRates, TrackType } from '@/lib/types';
import {
  buildBidRatesPayload,
  parseBidDbError,
  validateBidRatesForFloorCount,
} from '@/lib/validation/bidRates';

export async function submitBidAction(
  projectId: string,
  rates: BidRates,
  bidId?: string | null,
): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to submit a bid.', success: false };

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('track_type, sub_configuration, service_type, building_types, mistri_details, total_floors')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { error: 'Project not found.', success: false };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, service_type')
    .eq('id', user.id)
    .single();

  const isLabourContractor = profile?.role === 'labour_contractor';
  const isTradeBidder = profile?.role === 'service_provider';

  if (!isLabourContractor && !isTradeBidder) {
    return { error: 'You are not authorized to bid on this project type.', success: false };
  }

  if (project.service_type === 'construction_firm') {
    return { error: 'You are not authorized to bid on this project type.', success: false };
  }

  if (isTradeBidder && profile?.service_type !== project.service_type) {
    return { error: 'This project is not for your registered trade.', success: false };
  }

  if (isLabourContractor && project.service_type !== 'labour_contractor') {
    return { error: 'You are not authorized to bid on this project type.', success: false };
  }

  // Trades + Drawing & Design use one package rate (ground_rate only).
  const floorCount =
    isTradeServiceType(project.service_type) || isDrawingDesignServiceType(project.service_type)
      ? 1
      : resolveProjectBidFloors({
          track_type: project.track_type as TrackType,
          sub_configuration: project.sub_configuration,
          building_types: project.building_types,
          mistri_details: project.mistri_details,
          total_floors: project.total_floors,
        }).count;

  const validation = validateBidRatesForFloorCount(rates, floorCount, {
    requireMultipleOfFive:
      project.service_type !== 'painter' && project.service_type !== 'electrician',
  });
  if (!validation.valid) {
    return { error: validation.message ?? 'Invalid bid rates.', success: false };
  }

  const earthworkMode = resolveEarthworkBidMode({
    service_type: project.service_type,
    sub_configuration: project.sub_configuration,
  });
  const isTripBid = earthworkMode === 'trip' || rates.bid_unit === 'per_trip';
  if (isTripBid) {
    const capacity = parseVehicleCapacity(String(rates.vehicleCapacityCum ?? ''));
    if (capacity == null) {
      return { error: 'Enter the vehicle trip capacity in cu.m.', success: false };
    }
    rates.vehicleCapacityCum = capacity;
  }

  const ratesPayload = buildBidRatesPayload(
    {
      ...rates,
      bid_unit: earthworkMode
        ? bidUnitForEarthworkMode(earthworkMode)
        : project.service_type === 'plumber'
          ? 'flat'
          : project.service_type === 'electrician'
            ? 'per_point'
            : rates.bid_unit,
      vehicleCapacityCum: isTripBid ? rates.vehicleCapacityCum : undefined,
    },
    floorCount,
  );

  if (bidId) {
    const { error: updateError } = await supabase
      .from('bids')
      .update({
        rates: ratesPayload,
        service_type: project.service_type,
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
      service_type: project.service_type,
      is_withdrawn: false,
    });

    if (insertError) {
      return { error: parseBidDbError(insertError.message), success: false };
    }
  }

  revalidatePath('/dashboard/builder');
  revalidatePath(`/dashboard/builder/bid/${projectId}`);

  return { error: null, success: true };
}
