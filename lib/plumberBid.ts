import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  CPVC_PIPE_SIZE_OPTIONS,
  DRAINAGE_INSTALL_METHOD_OPTIONS,
  WATER_INSTALL_METHOD_OPTIONS,
  parseTradeDetails,
  type CpvcPipeSize,
  type DrainageInstallMethod,
  type PlumberDetails,
  type WaterInstallMethod,
} from '@/lib/tradeWorkDetails';

export const MAX_PLUMBING_BID_OPTIONS = 4;

export const PLUMBING_RATE_UNIT_LABEL = '₹ / Running Foot';

export const PLUMBING_TAPE_MEASURE_DISCLAIMER =
  'Final billing will be calculated based on the actual tape measurement at the site using these pre-agreed unit rates.';

export interface PlumbingBidOptionInput {
  cpvcPipeSizes: CpvcPipeSize[];
  waterInstallMethods: WaterInstallMethod[];
  includeToiletWastePipe: boolean;
  drainageInstallMethods: DrainageInstallMethod[];
}

export interface PlumbingBidOption {
  id: string;
  shortLabel: string;
  label: string;
}

function pipeSizeLabel(size: CpvcPipeSize): string {
  return CPVC_PIPE_SIZE_OPTIONS.find((o) => o.value === size)?.label ?? size;
}

function waterMethodLabel(method: WaterInstallMethod): string {
  return WATER_INSTALL_METHOD_OPTIONS.find((o) => o.value === method)?.shortLabel ?? method;
}

function drainageMethodLabel(method: DrainageInstallMethod): string {
  return DRAINAGE_INSTALL_METHOD_OPTIONS.find((o) => o.value === method)?.shortLabel ?? method;
}

function optionLetter(index: number): string {
  return `Option ${String.fromCharCode(65 + index)}`;
}

export function countPlumbingBidOptions(input: PlumbingBidOptionInput): number {
  const waterCount = input.cpvcPipeSizes.length * input.waterInstallMethods.length;
  const drainCount = input.includeToiletWastePipe ? input.drainageInstallMethods.length : 0;
  return waterCount + drainCount;
}

export function buildPlumbingBidOptions(input: PlumbingBidOptionInput): PlumbingBidOption[] {
  const options: Omit<PlumbingBidOption, 'label'>[] = [];

  for (const size of input.cpvcPipeSizes) {
    for (const method of input.waterInstallMethods) {
      options.push({
        id: `cpvc:${size}:${method}`,
        shortLabel: `CPVC ${pipeSizeLabel(size)} — ${waterMethodLabel(method)}`,
      });
    }
  }

  if (input.includeToiletWastePipe) {
    for (const method of input.drainageInstallMethods) {
      options.push({
        id: `swr:4inch:${method}`,
        shortLabel: `4-inch Toilet Waste Pipe (SWR) — ${drainageMethodLabel(method)}`,
      });
    }
  }

  return options.slice(0, MAX_PLUMBING_BID_OPTIONS).map((option, index) => ({
    ...option,
    label: `${optionLetter(index)}: ${option.shortLabel}`,
  }));
}

export function plumbingInputFromDetails(details: PlumberDetails): PlumbingBidOptionInput {
  return {
    cpvcPipeSizes: details.cpvcPipeSizes ?? [],
    waterInstallMethods: details.waterInstallMethods ?? [],
    includeToiletWastePipe: details.includeToiletWastePipe === true,
    drainageInstallMethods: details.drainageInstallMethods ?? [],
  };
}

export function resolvePlumbingBidOptions(raw: unknown): PlumbingBidOption[] {
  const details = parseTradeDetails(raw);
  if (!details || details.service !== 'plumber') return [];
  const input = plumbingInputFromDetails(details);
  if (countPlumbingBidOptions(input) < 1) return [];
  return buildPlumbingBidOptions(input);
}

export function hasPlumbingMultiOptionBid(raw: unknown): boolean {
  return resolvePlumbingBidOptions(raw).length > 0;
}

export function readProjectPlumbingBidOptions(project: {
  trade_details?: unknown;
  sub_configuration?: unknown;
}): PlumbingBidOption[] {
  return resolvePlumbingBidOptions(readNestedProjectDetail(project, 'trade_details'));
}
