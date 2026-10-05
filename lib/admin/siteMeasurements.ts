/**
 * Trade-specific measurement lines for the Supervisor Site Visit Checklist.
 *
 * The lines are derived from what the Owner submitted on the project form and the agreed
 * (winning) bid rates. The supervisor enters the real measured quantity for each line and
 * the "Total Accurate Cost" is computed from those measurements x the agreed rates.
 *
 * Pure module (no server-only imports): safe on both the server and in client components.
 */
import {
  civilRatesFromBid,
  parseFlooringRatesFromBid,
  resolveMistriCivilFloors,
} from '@/lib/bid/mistriCivilCost';
import {
  buildPlumbingFixtureMeasurementLines,
  isPlumbingFixtureRateOption,
  isPlumbingPointRateProject,
  parsePlumbingRunningFootRate,
  parsePlumbingUnitRates,
  plumbingFixtureBidContextFromProject,
  plumbingFloorHeightSteps,
  plumbingFloorRateMultiplier,
  plumbingPointRateKey,
  readPlumbingPointRateFloors,
  readProjectPlumbingBidOptions,
} from '@/lib/plumberBid';
import {
  electricianPointRateKey,
  isElectricianPointRateProject,
  parseElectricianUnitRates,
  readElectricianPointRateFloors,
  readProjectElectricianBidOptions,
} from '@/lib/electricianBid';
import {
  ELECTRICIAN_FIXTURE_FIELDS,
  parseTradeDetails,
} from '@/lib/tradeWorkDetails';
import { parseInteriorUnitRates, readProjectInteriorBidOptions } from '@/lib/interiorBid';
import {
  parsePainterDetails,
  readPainterBidFloors,
  resolvePainterFloorAreaSqft,
} from '@/lib/painterDetails';
import { readNestedProjectDetail } from '@/lib/project/storedDetails';
import { getProjectWorkRequirementBlocks } from '@/lib/project/workRequirements';
import type { BidRates } from '@/lib/types';

export type MeasurementTradeKey = 'civil' | 'plumber' | 'electrician' | 'painter' | 'other';

export interface MeasurementLine {
  /** Stable key, stored with the measurement so it survives re-opening the checklist. */
  id: string;
  /** Sub-card heading the line is grouped under (floor name, "Point rate", ...). */
  group: string;
  label: string;
  unit: string;
  /** Agreed rate (₹ per unit) taken from the winning bid. Read-only on the checklist. */
  rate: number;
  /** Storeys above ground for the +5% floor allowance. Ground is 0. */
  floorSteps?: number;
  /** Extra rate multiplier (floor allowance, or 2 when wall plastering on both sides is in scope). */
  rateMultiplier?: number;
  /** Quantity the Owner declared on the project form (null when not a measured quantity). */
  ownerQuantity: number | null;
}

export interface MeasuredLineItem {
  id: string;
  group: string;
  label: string;
  unit: string;
  rate: number;
  rateMultiplier?: number;
  quantity: number;
  amount: number;
}

export interface MeasurementTemplate {
  tradeKey: MeasurementTradeKey;
  tradeLabel: string;
  /** Civil / Mistri work records plot and plinth dimensions; other trades measure items only. */
  needsPlotDimensions: boolean;
  lines: MeasurementLine[];
  /** Fields copied verbatim from the Owner's project submission form. */
  ownerSpecs: Array<{ label: string; value: string }>;
  ownerSpecsTitle: string;
  /** Total of the winning bid as originally placed (for comparison with the measured cost). */
  agreedBidTotal: number | null;
}

type ProjectLike = {
  service_type?: string | null;
  track_type?: string | null;
  total_floors?: number | null;
  sub_configuration?: unknown;
  building_types?: string[] | null;
  mistri_details?: unknown;
  trade_details?: unknown;
  painter_details?: unknown;
  drawing_details?: unknown;
  floor_area_sqft?: number | null;
  district?: string | null;
  pincode?: string | null;
};

const FLOOR_RATE_KEYS = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'] as const;

function positive(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Friendly measured-quantity unit for a bid rate suffix such as "/Rft", "/sqft", "/unit". */
export function measurementUnitFromSuffix(suffix: string | null | undefined): string {
  const s = (suffix ?? '').toLowerCase();
  if (s.includes('rft') || s.includes('running')) return 'Rft';
  if (s.includes('sqft') || s.includes('sq')) return 'sq. ft.';
  if (s.includes('point')) return 'points';
  if (s.includes('trip')) return 'trips';
  return 'units';
}

function ownerQuantityFromLabel(label: string): number | null {
  const match = label.match(/[×x]\s*(\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function optionLines(
  options: Array<{ id: string; shortLabel: string; label: string; unitSuffix: string }>,
  unitRates: Record<string, number>,
  rates: Partial<BidRates>,
  group: string,
): MeasurementLine[] {
  return options.flatMap((option, index) => {
    const key = FLOOR_RATE_KEYS[index];
    const rate = unitRates[option.id] ?? (key ? positive(rates[key]) : 0);
    if (!(rate > 0)) return [];
    return [
      {
        id: `opt:${option.id}`,
        group,
        label: option.shortLabel.replace(/\s*[×x]\s*\d+(?:\.\d+)?\s*$/, ''),
        unit: measurementUnitFromSuffix(option.unitSuffix),
        rate,
        ownerQuantity: ownerQuantityFromLabel(option.shortLabel) ?? ownerQuantityFromLabel(option.label),
      },
    ];
  });
}

function civilLines(project: ProjectLike, rates: Partial<BidRates>): MeasurementLine[] {
  const floors = resolveMistriCivilFloors(project as Parameters<typeof resolveMistriCivilFloors>[0]);
  const civilRates = civilRatesFromBid(rates, floors);
  const flooringRates = parseFlooringRatesFromBid(rates, floors);
  const lines: MeasurementLine[] = [];

  floors.forEach((floor, index) => {
    const rate = civilRates[index] ?? 0;
    if (floor.costKind === 'wall') {
      if (rate > 0) {
        lines.push({
          id: `wall:${floor.floorId}`,
          group: floor.label,
          label: 'Wall construction & plastering (wall area)',
          unit: 'sq. ft.',
          rate,
          rateMultiplier: floor.wallRateMultiplier > 1 ? floor.wallRateMultiplier : undefined,
          ownerQuantity: floor.wallAreaSqft > 0 ? floor.wallAreaSqft : null,
        });
      }
    } else if (floor.costKind === 'civil' && rate > 0) {
      lines.push({
        id: `civil:${floor.floorId}`,
        group: floor.label,
        label: floor.scopeTitle || 'Civil construction (slab / plinth area)',
        unit: 'sq. ft.',
        rate,
        ownerQuantity: floor.slabAreaSqft > 0 ? floor.slabAreaSqft : null,
      });
    }
    const flooringRate = flooringRates[floor.floorId] ?? 0;
    if (floor.includeFlooring && flooringRate > 0) {
      lines.push({
        id: `flooring:${floor.floorId}`,
        group: floor.label,
        label: `${floor.flooringMaterialLabel || 'Flooring'} fitting (floor area)`,
        unit: 'sq. ft.',
        rate: flooringRate,
        ownerQuantity: floor.flooringAreaSqft > 0 ? floor.flooringAreaSqft : null,
      });
    }
  });
  return lines;
}

function plumbingLines(project: ProjectLike, rates: Partial<BidRates>): MeasurementLine[] {
  const unitRates = parsePlumbingUnitRates(rates.unit_rates);
  const fixtureOptions = readProjectPlumbingBidOptions(project);
  if (fixtureOptions.length > 0 && fixtureOptions.every(isPlumbingFixtureRateOption)) {
    return buildPlumbingFixtureMeasurementLines(
      unitRates,
      fixtureOptions,
      plumbingFixtureBidContextFromProject(project),
    ).map((line) => ({
      id: line.id,
      group: line.group,
      label: line.label,
      unit: 'nos',
      rate: line.rate,
      floorSteps: line.floorSteps,
      ...(line.rateMultiplier ? { rateMultiplier: line.rateMultiplier } : {}),
      ownerQuantity: line.ownerQuantity,
    }));
  }
  if (isPlumbingPointRateProject(readNestedProjectDetail(project, 'trade_details'))) {
    const lines: MeasurementLine[] = readPlumbingPointRateFloors(project).flatMap((floor) => {
      const rate = unitRates[plumbingPointRateKey(floor.floor)] ?? 0;
      if (!(rate > 0)) return [];
      return [
        {
          id: `point:${floor.floor}`,
          group: floor.label,
          label: `Plumbing points${floor.breakdown ? ` (${floor.breakdown})` : ''}`,
          unit: 'points',
          rate,
          ownerQuantity: floor.points > 0 ? floor.points : null,
        },
      ];
    });
    const running = parsePlumbingRunningFootRate(rates);
    if (running != null) {
      lines.push({
        id: 'running_foot',
        group: 'Extra connection lines',
        label: 'Extra running-foot pipe lines',
        unit: 'Rft',
        rate: running,
        ownerQuantity: null,
      });
    }
    return lines;
  }
  return optionLines(readProjectPlumbingBidOptions(project), unitRates, rates, 'Plumbing work items');
}

function electricianFixtureLabel(label: string): string {
  return label.replace(/^No\. of /, '').replace(/\s*\([^)]*\)\s*$/, '');
}

function electricianLines(project: ProjectLike, rates: Partial<BidRates>): MeasurementLine[] {
  const unitRates = parseElectricianUnitRates(rates.unit_rates);
  const rawDetails = readNestedProjectDetail(project, 'trade_details');
  const details = parseTradeDetails(rawDetails);
  if (details?.service === 'electrician' && isElectricianPointRateProject(rawDetails)) {
    const floors = readElectricianPointRateFloors(project);
    const fixtureFields = ELECTRICIAN_FIXTURE_FIELDS.filter((field) =>
      floors.some((floor) => (floor.counts[field.key] ?? 0) > 0),
    );
    const ground =
      floors.find(
        (floor) => plumbingFloorHeightSteps(floor.floor, details.customTargetFloors) === 0,
      ) ?? floors[0];
    const lockedPointRate = ground ? (unitRates[electricianPointRateKey(ground.floor)] ?? 0) : 0;
    if (floors.length > 0 && fixtureFields.length > 0 && lockedPointRate > 0) {
      return floors.flatMap((floor) => {
        const steps = plumbingFloorHeightSteps(floor.floor, details.customTargetFloors);
        const multiplier = plumbingFloorRateMultiplier(steps);
        return fixtureFields.map((field) => ({
          id: `efix:${field.key}:${floor.floor}`,
          group: floor.label,
          label: electricianFixtureLabel(field.label),
          unit: 'nos',
          rate: lockedPointRate * field.points,
          floorSteps: steps,
          ...(multiplier !== 1 ? { rateMultiplier: multiplier } : {}),
          ownerQuantity: floor.counts[field.key] ?? 0,
        }));
      });
    }
    return floors.flatMap((floor) => {
      const rate = unitRates[electricianPointRateKey(floor.floor)] ?? 0;
      if (!(rate > 0) || fixtureFields.length === 0) {
        if (!(rate > 0)) return [];
        return [
          {
            id: `point:${floor.floor}`,
            group: floor.label,
            label: `Electrical points${floor.breakdown ? ` (${floor.breakdown})` : ''}`,
            unit: 'points',
            rate,
            ownerQuantity: floor.points > 0 ? floor.points : null,
          },
        ];
      }
      return fixtureFields.flatMap((field) => {
        if (!(floor.counts[field.key] > 0)) return [];
        return [
          {
            id: `efix:${field.key}:${floor.floor}`,
            group: floor.label,
            label: electricianFixtureLabel(field.label),
            unit: 'nos',
            rate: rate * field.points,
            ownerQuantity: floor.counts[field.key],
          },
        ];
      });
    });
  }
  return optionLines(
    readProjectElectricianBidOptions(project),
    unitRates,
    rates,
    'Electrical work items',
  );
}

function painterLines(project: ProjectLike, rates: Partial<BidRates>): MeasurementLine[] {
  const floors = readPainterBidFloors(project);
  if (floors.length > 0) {
    return floors.flatMap((floor, index) => {
      const key = FLOOR_RATE_KEYS[index];
      const rate = positive(rates.floor_rates?.[floor.id]) || (key ? positive(rates[key]) : 0);
      if (!(rate > 0)) return [];
      return [
        {
          id: `paint:${floor.id}`,
          group: floor.label,
          label: 'Painting area',
          unit: 'sq. ft.',
          rate,
          ownerQuantity: floor.areaSqft > 0 ? floor.areaSqft : null,
        },
      ];
    });
  }
  const details = parsePainterDetails(readNestedProjectDetail(project, 'painter_details'));
  const area = resolvePainterFloorAreaSqft(details, 1, project.floor_area_sqft);
  const rate = positive(rates.ground_rate);
  return rate > 0
    ? [
        {
          id: 'paint:all',
          group: 'Painting work',
          label: 'Painting area',
          unit: 'sq. ft.',
          rate,
          ownerQuantity: area > 0 ? area : null,
        },
      ]
    : [];
}

function interiorLines(project: ProjectLike, rates: Partial<BidRates>): MeasurementLine[] {
  return optionLines(
    readProjectInteriorBidOptions(project),
    parseInteriorUnitRates(rates.unit_rates),
    rates,
    'Interior work items',
  );
}

function genericLine(rates: Partial<BidRates>): MeasurementLine[] {
  const unit =
    rates.bid_unit === 'per_sqft'
      ? 'sq. ft.'
      : rates.bid_unit === 'per_point'
        ? 'points'
        : rates.bid_unit === 'per_trip'
          ? 'trips'
          : rates.bid_unit === 'per_running_foot'
            ? 'Rft'
            : 'units';
  return [
    {
      id: 'work:total',
      group: 'Work measurement',
      label: 'Total measured quantity of work',
      unit,
      rate: positive(rates.ground_rate),
      ownerQuantity: null,
    },
  ];
}

export function tradeLabelFor(serviceType: string | null | undefined): string {
  return resolveTrade(serviceType).label;
}

function resolveTrade(serviceType: string | null | undefined): {
  key: MeasurementTradeKey;
  label: string;
} {
  switch (serviceType) {
    case 'plumber':
      return { key: 'plumber', label: 'Plumbing' };
    case 'electrician':
      return { key: 'electrician', label: 'Electrical' };
    case 'painter':
      return { key: 'painter', label: 'Painting' };
    case 'false_ceiling_work':
      return { key: 'other', label: 'Interior Work' };
    case 'labour_contractor':
    case 'construction_firm':
    case null:
    case undefined:
      return { key: 'civil', label: 'Civil / Mistri' };
    default:
      return { key: 'other', label: serviceType.replace(/_/g, ' ') };
  }
}

/** Builds the trade-specific measurement lines + copied owner specs for a project and its winning bid. */
export function buildMeasurementTemplate(
  project: ProjectLike,
  rates: Partial<BidRates> | null | undefined,
): MeasurementTemplate {
  const bidRates = rates ?? {};
  const trade = resolveTrade(project.service_type);

  let lines: MeasurementLine[];
  switch (trade.key) {
    case 'civil':
      lines = civilLines(project, bidRates);
      break;
    case 'plumber':
      lines = plumbingLines(project, bidRates);
      break;
    case 'electrician':
      lines = electricianLines(project, bidRates);
      break;
    case 'painter':
      lines = painterLines(project, bidRates);
      break;
    default:
      lines = project.service_type === 'false_ceiling_work' ? interiorLines(project, bidRates) : [];
  }
  if (lines.length === 0) lines = genericLine(bidRates);
  // Lines without an agreed rate cannot be priced from a measurement.
  lines = lines.filter((line) => line.rate > 0);

  const requirements = getProjectWorkRequirementBlocks(
    project as Parameters<typeof getProjectWorkRequirementBlocks>[0],
  );
  const agreedBidTotal =
    positive(bidRates.total_estimated_cost) ||
    positive(bidRates.total_project_cost) ||
    positive(bidRates.total_civil_cost) ||
    positive(bidRates.total_bid_amount) ||
    null;

  return {
    tradeKey: trade.key,
    tradeLabel: trade.label,
    needsPlotDimensions: trade.key === 'civil',
    lines,
    ownerSpecs: (requirements?.blocks ?? [])
      .filter((block) => block.value?.trim())
      .map((block) => ({ label: block.label.replace(/:$/, ''), value: block.value })),
    ownerSpecsTitle: requirements?.title ?? `${trade.label} Work Requirements`,
    agreedBidTotal,
  };
}

/** Locked bid rate after the floor surcharge. Ground stays at the accepted rate; 1st floor is +5%, 2nd is +10%. */
export function effectiveUnitRate(line: Pick<MeasurementLine, 'rate' | 'rateMultiplier'>): number {
  if (!(line.rate > 0)) return 0;
  const multiplier = line.rateMultiplier && line.rateMultiplier > 0 ? line.rateMultiplier : 1;
  return Math.round(line.rate * multiplier);
}

export function lineAmount(line: Pick<MeasurementLine, 'rate' | 'rateMultiplier'>, quantity: number): number {
  if (!(quantity > 0) || !(line.rate > 0)) return 0;
  return Math.round(quantity * effectiveUnitRate(line));
}

function parseQuantity(raw: string | undefined): number | null {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Itemised measured lines + the "Total Accurate Cost" from the supervisor's entries. A blank quantity counts as 0. */
export function computeMeasuredCost(
  lines: MeasurementLine[],
  measurements: Record<string, string>,
): { items: MeasuredLineItem[]; total: number; missing: MeasurementLine[] } {
  const items: MeasuredLineItem[] = lines.map((line) => {
    const quantity = parseQuantity(measurements[line.id]) ?? 0;
    return {
      id: line.id,
      group: line.group,
      label: line.label,
      unit: line.unit,
      rate: line.rate,
      ...(line.rateMultiplier ? { rateMultiplier: line.rateMultiplier } : {}),
      quantity,
      amount: lineAmount(line, quantity),
    };
  });
  return { items, total: items.reduce((sum, item) => sum + item.amount, 0), missing: [] };
}

/** Cost implied by the Owner's own declared quantities (null when a line has no declared quantity). */
export function computeOwnerEstimate(lines: MeasurementLine[]): number | null {
  if (lines.length === 0 || lines.some((line) => line.ownerQuantity == null)) return null;
  return lines.reduce((sum, line) => sum + lineAmount(line, line.ownerQuantity ?? 0), 0);
}

export function groupMeasurementLines<T extends { group: string }>(lines: T[]): Array<{ group: string; lines: T[] }> {
  const groups: Array<{ group: string; lines: T[] }> = [];
  for (const line of lines) {
    const existing = groups.find((g) => g.group === line.group);
    if (existing) existing.lines.push(line);
    else groups.push({ group: line.group, lines: [line] });
  }
  return groups;
}
