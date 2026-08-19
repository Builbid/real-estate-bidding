import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import {
  activeBathroomPackageSelections,
  getBathroomPackageLabel,
  getBathroomPackageShortLabel,
  getPipingPackageLabel,
  parseTradeDetails,
  type BathroomPackage,
  type BathroomPackageSelection,
  type CpvcPipeSize,
  type DrainageInstallMethod,
  type PipingPackageKind,
  type PlumberDetails,
  type WaterInstallMethod,
} from '@/lib/tradeWorkDetails';

export const MAX_PLUMBING_BID_OPTIONS = 4;

export const PLUMBING_RATE_UNIT_LABEL = '₹ / Running Foot';

export const PLUMBING_TAPE_MEASURE_DISCLAIMER =
  'Final settlement will be based on actual site measurement at agreed unit rates.';

export type PlumbingRateUnit = 'package' | 'per_running_foot';

export interface PlumbingBidOptionInput {
  bathroomPackage?: BathroomPackage | null;
  bathroomPackages?: BathroomPackageSelection[];
  pipingPackage?: PipingPackageKind | null;
  cpvcPipeSizes: CpvcPipeSize[];
  waterInstallMethods: WaterInstallMethod[];
  includeToiletWastePipe: boolean;
  drainageInstallMethods: DrainageInstallMethod[];
}

export interface PlumbingBidOption {
  id: string;
  shortLabel: string;
  label: string;
  unit: PlumbingRateUnit;
  unitSuffix: string;
}

function optionLetter(index: number): string {
  return `Option ${String.fromCharCode(65 + index)}`;
}

function withLetters(options: Omit<PlumbingBidOption, 'label'>[]): PlumbingBidOption[] {
  return options.slice(0, MAX_PLUMBING_BID_OPTIONS).map((option, index) => ({
    ...option,
    label: `${optionLetter(index)}: ${option.shortLabel}`,
  }));
}

function tapWaterOption(pipingPackage: PipingPackageKind | null): Omit<PlumbingBidOption, 'label'> {
  const fitting =
    pipingPackage === 'concealing'
      ? 'Concealing / Wall-Cut'
      : pipingPackage === 'non_concealing'
        ? 'Non-Concealing / Open Fitting'
        : '¾ inch CPVC';
  return {
    id: 'pipe:tap:three_quarter',
    shortLabel: `Tap Water Pipe — ¾ inch CPVC (${fitting})`,
    unit: 'per_running_foot',
    unitSuffix: '/Rft',
  };
}

function toiletDrainOption(): Omit<PlumbingBidOption, 'label'> {
  return {
    id: 'pipe:toilet:swr',
    shortLabel: 'Toilet Drainage Pipe — 4-inch SWR (Non-Concealing)',
    unit: 'per_running_foot',
    unitSuffix: '/Rft',
  };
}

function bathroomRateOption(
  item: BathroomPackageSelection,
): Omit<PlumbingBidOption, 'label'> {
  const name = getBathroomPackageShortLabel(item.package);
  return {
    id: `package:${item.package}`,
    shortLabel: `${name} Bathroom Package Rate × ${item.quantity}`,
    unit: 'package',
    unitSuffix: '/unit',
  };
}

export function countPlumbingBidOptions(input: PlumbingBidOptionInput): number {
  return buildPlumbingBidOptions(input).length;
}

export function buildPlumbingBidOptions(input: PlumbingBidOptionInput): PlumbingBidOption[] {
  const active = activeBathroomPackageSelections(input.bathroomPackages);
  const hasPackageSystem = active.length > 0 || Boolean(input.pipingPackage);

  if (hasPackageSystem) {
    const piping = input.pipingPackage ?? null;
    const tap = tapWaterOption(piping);
    const drain = toiletDrainOption();
    if (active.length === 0) {
      return withLetters([tap, drain]);
    }
    if (active.length > 2) {
      const summary = active
        .map((item) => `${item.quantity}× ${getBathroomPackageShortLabel(item.package)}`)
        .join(' + ');
      return withLetters([
        {
          id: 'package:mixed',
          shortLabel: `Bathroom Package Rate — ${summary}`,
          unit: 'package',
          unitSuffix: '/unit',
        },
        tap,
        drain,
      ]);
    }
    return withLetters([...active.map(bathroomRateOption), tap, drain]);
  }

  const options: Omit<PlumbingBidOption, 'label'>[] = [];
  if (input.bathroomPackage) {
    const packageName = getBathroomPackageLabel(input.bathroomPackage);
    options.push({
      id: `package:${input.bathroomPackage}`,
      shortLabel: packageName
        ? `Bathroom Package Rate — ${packageName}`
        : 'Bathroom Package Rate',
      unit: 'package',
      unitSuffix: '/unit',
    });
  }

  for (const size of input.cpvcPipeSizes) {
    for (const method of input.waterInstallMethods) {
      options.push({
        id: `cpvc:${size}:${method}`,
        shortLabel: `Tap Water Pipe — ${size} / ${method}`,
        unit: 'per_running_foot',
        unitSuffix: '/Rft',
      });
    }
  }

  if (input.includeToiletWastePipe) {
    for (const method of input.drainageInstallMethods) {
      options.push({
        id: `swr:4inch:${method}`,
        shortLabel: `Toilet Drainage Pipe — ${method}`,
        unit: 'per_running_foot',
        unitSuffix: '/Rft',
      });
    }
  }

  return withLetters(options);
}

export function plumbingInputFromDetails(details: PlumberDetails): PlumbingBidOptionInput {
  return {
    bathroomPackage: details.bathroomPackage ?? null,
    bathroomPackages: details.bathroomPackages,
    pipingPackage: details.pipingPackage ?? null,
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

export function getPipingPackageBidCaption(kind: PipingPackageKind | null | undefined): string {
  return getPipingPackageLabel(kind);
}
