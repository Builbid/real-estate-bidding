'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  bidUnitForEarthworkMode,
  parseVehicleCapacity,
  resolveEarthworkBidMode,
} from '@/lib/bid/earthworkBid';
import { resolveScopeRateBidItems } from '@/lib/bid/scopeRateBid';
import { resolveProjectBidFloors } from '@/lib/bid/floorRateDisplay';
import { missingProjectsColumn } from '@/lib/project/storedDetails';
import { isDrawingDesignServiceType } from '@/lib/drawingDesign';
import { isTradeServiceType } from '@/lib/trades';
import type { BidRates, ServiceType, SubConfiguration, TrackType } from '@/lib/types';
import {
  buildBidRatesPayload,
  getBidRateFieldError,
  getBidRateRules,
  parseBidDbError,
  validateBidRatesForFloorCount,
} from '@/lib/validation/bidRates';
import {
  buildElectricianUnitRatePayload,
  parseElectricianUnitRates,
  electricianWeightageContextFromProject,
  readProjectElectricianBidOptions,
  validateElectricianUnitRateInputs,
  type ElectricianBidOption,
} from '@/lib/electricianBid';
import {
  buildPlumbingPointRatePayload,
  buildPlumbingUnitRatePayload,
  isPlumbingPointRateProject,
  parsePlumbingUnitRates,
  plumbingPointRateKey,
  plumbingWeightageContextFromProject,
  readPlumbingPointRateFloors,
  readProjectPlumbingBidOptions,
  validatePlumbingUnitRateInputs,
  type PlumbingBidOption,
} from '@/lib/plumberBid';
import {
  buildInteriorUnitRatePayload,
  parseInteriorUnitRates,
  interiorWeightageContextFromProject,
  readProjectInteriorBidOptions,
  validateInteriorUnitRateInputs,
  type InteriorBidOption,
} from '@/lib/interiorBid';

type UnitRateBidOption = PlumbingBidOption | ElectricianBidOption | InteriorBidOption;

function readProjectUnitRateOptions(project: {
  service_type?: ServiceType | string | null;
  trade_details?: unknown;
}): UnitRateBidOption[] {
  if (project.service_type === 'electrician') {
    return readProjectElectricianBidOptions(project);
  }
  if (project.service_type === 'false_ceiling_work') {
    return readProjectInteriorBidOptions(project);
  }
  return readProjectPlumbingBidOptions(project);
}

function parseProjectUnitRates(
  project: { service_type?: ServiceType | string | null },
  raw: unknown,
): Record<string, number> {
  if (project.service_type === 'electrician') {
    return parseElectricianUnitRates(raw);
  }
  if (project.service_type === 'false_ceiling_work') {
    return parseInteriorUnitRates(raw);
  }
  return parsePlumbingUnitRates(raw);
}

function validateProjectUnitRates(
  project: { service_type?: ServiceType | string | null },
  rates: BidRates,
  options: UnitRateBidOption[],
) {
  const rules = getBidRateRules(project.service_type ?? 'plumber');
  const unitRates = parseProjectUnitRates(project, rates.unit_rates);
  if (project.service_type === 'electrician') {
    return validateElectricianUnitRateInputs(unitRates, options as ElectricianBidOption[], rules);
  }
  if (project.service_type === 'false_ceiling_work') {
    return validateInteriorUnitRateInputs(unitRates, options as InteriorBidOption[], rules);
  }
  return validatePlumbingUnitRateInputs(unitRates, options as PlumbingBidOption[], rules);
}

function buildProjectUnitRatePayload(
  project: { service_type?: ServiceType | string | null; trade_details?: unknown },
  unitRates: Record<string, number>,
  options: UnitRateBidOption[],
) {
  if (project.service_type === 'electrician') {
    return buildElectricianUnitRatePayload(
      unitRates,
      options as ElectricianBidOption[],
      electricianWeightageContextFromProject(project),
    );
  }
  if (project.service_type === 'false_ceiling_work') {
    return buildInteriorUnitRatePayload(
      unitRates,
      options as InteriorBidOption[],
      interiorWeightageContextFromProject(project),
    );
  }
  return buildPlumbingUnitRatePayload(
    unitRates,
    options as PlumbingBidOption[],
    plumbingWeightageContextFromProject(project),
  );
}

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

  type BidProjectRow = {
    track_type: TrackType;
    sub_configuration: SubConfiguration | null;
    service_type: ServiceType | null;
    building_types: string[] | null;
    mistri_details: unknown;
    trade_details?: unknown;
    total_floors: number | null;
  };

  const firstLookup = await supabase
    .from('projects')
    .select('track_type, sub_configuration, service_type, building_types, mistri_details, trade_details, total_floors')
    .eq('id', projectId)
    .single();

  let project: BidProjectRow | null = firstLookup.data as BidProjectRow | null;
  let projectError = firstLookup.error;

  if (projectError && missingProjectsColumn(projectError.message) === 'trade_details') {
    const retry = await supabase
      .from('projects')
      .select('track_type, sub_configuration, service_type, building_types, mistri_details, total_floors')
      .eq('id', projectId)
      .single();
    project = retry.data
      ? ({ ...retry.data, trade_details: undefined } as BidProjectRow)
      : null;
    projectError = retry.error;
  }

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

  const scopeBid = resolveScopeRateBidItems({
    service_type: project.service_type,
    trade_details: project.trade_details,
    mistri_details: project.mistri_details,
    sub_configuration: project.sub_configuration,
    track_type: project.track_type,
    building_types: project.building_types,
    total_floors: project.total_floors,
  }, profile?.service_type);

  const floorCount =
    scopeBid?.count
      ?? (isTradeServiceType(project.service_type) || isDrawingDesignServiceType(project.service_type)
        ? 1
        : resolveProjectBidFloors({
            track_type: project.track_type as TrackType,
            sub_configuration: project.sub_configuration,
            building_types: project.building_types,
            mistri_details: project.mistri_details,
            total_floors: project.total_floors,
          }).count);

  const pointRateFloors = isPlumbingPointRateProject(project.trade_details)
    ? readPlumbingPointRateFloors(project)
    : [];
  const isPointRateBid = Boolean(scopeBid?.pointRateBid && pointRateFloors.length > 0);

  const unitRateOptions = scopeBid?.unitRateBid
    ? readProjectUnitRateOptions(project)
    : [];

  const validation = scopeBid?.unitRateBid
    ? validateProjectUnitRates(project, rates, unitRateOptions)
    : validateBidRatesForFloorCount(
        rates,
        floorCount,
        scopeBid?.flexibleRates
          ? { requireMultipleOfFive: false }
          : getBidRateRules(project.service_type, profile?.service_type),
      );
  if (!validation.valid) {
    return { error: validation.message ?? 'Invalid bid rates.', success: false };
  }

  const rateRules = scopeBid?.flexibleRates
    ? { requireMultipleOfFive: false }
    : getBidRateRules(project.service_type, profile?.service_type);
  if (isPointRateBid && rates.running_foot_rate != null && rates.running_foot_rate > 0) {
    const runningFootError = getBidRateFieldError(rates.running_foot_rate, rateRules);
    if (runningFootError) {
      return { error: runningFootError, success: false };
    }
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

  const unitRatePayload = scopeBid?.unitRateBid
    ? buildProjectUnitRatePayload(
        project,
        parseProjectUnitRates(project, rates.unit_rates),
        unitRateOptions,
      )
    : null;

  const pointRatePayload = isPointRateBid
    ? buildPlumbingPointRatePayload(
        Object.fromEntries(
          pointRateFloors.map((floor, index) => {
            const key = (['ground_rate', 'first_rate', 'second_rate', 'third_rate'] as const)[index];
            return [plumbingPointRateKey(floor.floor), key ? (rates[key] ?? 0) : 0];
          }),
        ),
        pointRateFloors,
        rates.running_foot_rate,
      )
    : null;

  const ratesPayload = buildBidRatesPayload(
    {
      ...rates,
      ...(unitRatePayload ?? pointRatePayload ?? {}),
      bid_unit: earthworkMode
        ? bidUnitForEarthworkMode(earthworkMode)
        : unitRatePayload || pointRatePayload
          ? 'per_point'
          : project.service_type === 'plumber'
            ? (scopeBid?.kind === 'plumbing' ? 'per_running_foot' : 'flat')
            : project.service_type === 'electrician'
              ? 'per_point'
              : rates.bid_unit,
      vehicleCapacityCum: isTripBid ? rates.vehicleCapacityCum : undefined,
    },
    unitRatePayload ? 1 : floorCount,
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
      return { error: parseBidDbError(updateError.message, project.service_type), success: false };
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
      return { error: parseBidDbError(insertError.message, project.service_type), success: false };
    }
  }

  revalidatePath('/dashboard/builder');
  revalidatePath(`/dashboard/builder/bid/${projectId}`);

  return { error: null, success: true };
}
