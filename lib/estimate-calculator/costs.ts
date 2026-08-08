// ============================================================
// Material + finishing cost engine (uses quantities × client rates)
// ============================================================

import {
  getExteriorWallPerimeterFt,
  getPlinthExteriorWallAreaSqft,
  getSuperstructureExteriorWallAreaSqft,
} from './calculate';
import {
  getFloorConfigs,
  getKitchenCount,
  getTotalToilets,
} from './calculate';
import {
  STANDARD_FINISH_RATES,
  doorsPerFloorForUnit,
  kitchenRftForUnit,
  steelRateForDia,
  windowsPerFloorForUnit,
} from './rates';
import type { EstimateInputs, EstimateResults, ItemRates } from './types';

const SQFT_TO_SQM = 0.092903;
const FT_TO_M = 0.3048;

export interface CostLineItem {
  key: string;
  label: string;
  quantityLabel: string;
  rateLabel: string;
  amount: number;
}

export interface CostBreakdown {
  materialLines: CostLineItem[];
  materialTotal: number;
  mistriLabour: CostLineItem;
  finishingLines: CostLineItem[];
  finishingTotal: number;
  /** Materials + mistri + finishing. */
  grandTotal: number;
  totalBuiltUpSqft: number;
  paintedSurfaceSqft: number;
  flooringAreaSqft: number;
  formworkAreaSqm: number;
  soilFillCum: number;
}

function inr(n: number): number {
  return Math.round(n);
}

/** ASCII Indian grouping (e.g. 2,58,030) — safe for jsPDF Helvetica. */
function formatIndianNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
  const [intPart, decPart] = fixed.split('.');
  const neg = intPart.startsWith('-');
  const digits = neg ? intPart.slice(1) : intPart;
  let grouped: string;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    const last3 = digits.slice(-3);
    let rest = digits.slice(0, -3);
    const parts: string[] = [];
    while (rest.length > 2) {
      parts.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) parts.unshift(rest);
    grouped = `${parts.join(',')},${last3}`;
  }
  const body = decPart != null ? `${grouped}.${decPart}` : grouped;
  return neg ? `-${body}` : body;
}

function fmtQty(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 1e-9) return formatIndianNumber(n, 0);
  return formatIndianNumber(n, decimals);
}

function rs(amount: number): string {
  return `Rs. ${formatIndianNumber(amount, 0)}`;
}

function rsRate(n: number, unit: string, decimals = 0): string {
  return `Rs. ${fmtQty(n, decimals)}/${unit}`;
}

/** Approx RCC formwork contact area (sqm) from member geometry. */
export function estimateFormworkAreaSqm(inputs: EstimateInputs, results: EstimateResults): number {
  const floors = Math.max(0, inputs.floors);
  const columns = Math.max(0, Math.floor(inputs.columnCount));
  const beams = Math.max(0, Math.floor(inputs.beamCount));
  const hM = results.meta.totalColumnHeightFt * FT_TO_M;
  const colW = inputs.columnWidthMm / 1000;
  const colD = inputs.columnDepthMm / 1000;
  const colForm = columns * 2 * (colW + colD) * Math.max(0, hM);

  const beamW = inputs.beamWidthMm / 1000;
  const beamD = inputs.beamDepthMm / 1000;
  const beamLenM = inputs.avgBeamLengthFt * FT_TO_M;
  // Floor beams + matching plinth beams (bottom + two sides)
  const beamForm = (beams + results.meta.plinthBeamCount) * (beamW + 2 * beamD) * Math.max(0, beamLenM);

  const lintelLenM = results.meta.lintelLengthFt * FT_TO_M;
  const lintelForm = (0.23 + 2 * 0.15) * Math.max(0, lintelLenM);

  const slabForm = results.meta.slabAreaSqft * SQFT_TO_SQM;
  const stairForm = results.meta.staircaseAreaSqft * SQFT_TO_SQM * 1.3;
  const footingForm =
    results.meta.footingCount *
    (inputs.footingLengthMm / 1000) *
    (inputs.footingWidthMm / 1000);

  void floors;
  return Math.max(0, colForm + beamForm + lintelForm + slabForm + stairForm + footingForm);
}

export function calculateCostBreakdown(
  inputs: EstimateInputs,
  results: EstimateResults,
  rates: ItemRates,
): CostBreakdown {
  const floors = Math.max(0, inputs.floors);
  const builtUpPerFloor = Math.max(0, inputs.builtUpAreaPerFloorSqft);
  const totalBuiltUpSqft = builtUpPerFloor * floors;

  // ── Materials ───────────────────────────────────────────────
  const cementAmt = results.cementBags * rates.cementPerBag;
  const sandAmt = results.sandCum * rates.sandPerCum;
  const aggAmt = results.aggregateCum * rates.aggregatePerCum;
  const brickAmt = results.bricks * rates.brickPerPiece;

  const materialLines: CostLineItem[] = [
    {
      key: 'cement',
      label: 'Cement',
      quantityLabel: `${fmtQty(results.cementBags, 0)} bags`,
      rateLabel: rsRate(rates.cementPerBag, 'bag'),
      amount: inr(cementAmt),
    },
    {
      key: 'sand',
      label: 'Sand',
      quantityLabel: `${fmtQty(results.sandCum)} cum`,
      rateLabel: rsRate(rates.sandPerCum, 'cum'),
      amount: inr(sandAmt),
    },
    {
      key: 'aggregate',
      label: 'Coarse aggregate (Giti)',
      quantityLabel: `${fmtQty(results.aggregateCum)} cum`,
      rateLabel: rsRate(rates.aggregatePerCum, 'cum'),
      amount: inr(aggAmt),
    },
    {
      key: 'bricks',
      label: 'Bricks',
      quantityLabel: `${fmtQty(results.bricks, 0)} nos`,
      rateLabel: rsRate(rates.brickPerPiece, 'pc', 1),
      amount: inr(brickAmt),
    },
  ];

  let steelTotal = 0;
  for (const row of results.steelByDiameter) {
    const rate = steelRateForDia(rates, row.diameterMm);
    const amt = row.quintals * rate;
    steelTotal += amt;
    materialLines.push({
      key: `steel-${row.diameterMm}`,
      label: `Steel ${row.diameterMm} mm`,
      quantityLabel: `${fmtQty(row.quintals)} Q`,
      rateLabel: rsRate(rate, 'Q'),
      amount: inr(amt),
    });
  }

  const materialTotal = inr(
    cementAmt + sandAmt + aggAmt + brickAmt + steelTotal,
  );

  // Mistri = total slab area (sqft) × rate / sqft
  const totalSlabSqft = Math.max(0, results.meta.slabAreaSqft);
  const mistriAmt = totalSlabSqft * rates.mistriPerSqft;
  const mistriLabour: CostLineItem = {
    key: 'mistri',
    label: 'Mistri / labour (slab area)',
    quantityLabel: `${fmtQty(totalSlabSqft, 0)} sqft slab`,
    rateLabel: rsRate(rates.mistriPerSqft, 'sqft'),
    amount: inr(mistriAmt),
  };

  // ── Finishing & allied (standard quality) ───────────────────
  const R = STANDARD_FINISH_RATES;
  const superExt = getSuperstructureExteriorWallAreaSqft(inputs);
  const plinthExt = getPlinthExteriorWallAreaSqft(inputs);
  const interior = results.meta.interiorWallAreaSqft;
  // Interior both faces + exterior one face + ceilings (slab soffit)
  const paintedSurfaceSqft =
    (superExt + plinthExt + interior) * 2 * 0.9 + results.meta.slabAreaSqft;
  const paintingAmt = paintedSurfaceSqft * R.paintingPerSqftSurface;

  const flooringAreaSqft = totalBuiltUpSqft * R.flooringAreaFactor;
  const floorRate =
    rates.flooringFinish === 'granite' ? R.graniteFlooringPerSqft : R.tileFlooringPerSqft;
  const flooringAmt = flooringAreaSqft * floorRate;
  const flooringLabel =
    rates.flooringFinish === 'granite'
      ? 'Granite flooring (std.)'
      : 'Tile flooring (vitrified)';

  const floorConfigs = getFloorConfigs(inputs);
  const totalToilets = getTotalToilets(inputs);
  const kitchenCount = getKitchenCount(inputs);
  const toiletPlumbingAmt = totalToilets * R.plumbingPerToilet;
  const toiletWetWorksAmt = totalToilets * R.toiletWetWorksPerToilet;
  const kitchenPlumbingAmt = kitchenCount * R.plumbingKitchenLump;

  const electricalAmt = totalBuiltUpSqft * R.electricalPerSqftBuiltUp;

  // Doors/windows/kitchen cabinets summed per floor from that floor's BHK
  let totalInternalDoors = 0;
  let totalWindows = 0;
  let modularKitchenAmt = 0;
  for (const cfg of floorConfigs) {
    totalInternalDoors += doorsPerFloorForUnit(cfg.unitType, builtUpPerFloor);
    totalWindows += windowsPerFloorForUnit(cfg.unitType, builtUpPerFloor);
    modularKitchenAmt +=
      kitchenRftForUnit(cfg.unitType, builtUpPerFloor) * R.modularKitchenPerRft;
  }
  const doorsWindowsAmt =
    R.mainDoorLump +
    totalInternalDoors * R.internalDoorEach +
    totalWindows * R.windowEach;

  const formworkAreaSqm = estimateFormworkAreaSqm(inputs, results);
  const formworkAmt = formworkAreaSqm * R.formworkPerSqm;

  const footprintSqft = builtUpPerFloor; // ground floor footprint
  const antiTermiteAmt = footprintSqft * R.antiTermitePerSqftFootprint;

  const perimeterFt = getExteriorWallPerimeterFt(inputs);
  // Fill under floors / plinth band: footprint × plinth height (compacted)
  const soilFillCum =
    footprintSqft * SQFT_TO_SQM * Math.max(0, inputs.plinthHeightFt) * FT_TO_M;
  // Extra fill under exterior plinth wall trench approx 15% of main fill
  const soilFillTotal = soilFillCum * 1.15 + (perimeterFt * FT_TO_M * 0.45 * 0.6 * Math.max(0, inputs.plinthHeightFt) * FT_TO_M);
  const soilFillAmt = soilFillTotal * R.soilFillPerCum;

  const finishingLines: CostLineItem[] = [
    {
      key: 'painting',
      label: 'Painting (putty + emulsion)',
      quantityLabel: `${fmtQty(paintedSurfaceSqft, 0)} sqft surface`,
      rateLabel: rsRate(R.paintingPerSqftSurface, 'sqft'),
      amount: inr(paintingAmt),
    },
    {
      key: 'flooring',
      label: flooringLabel,
      quantityLabel: `${fmtQty(flooringAreaSqft, 0)} sqft`,
      rateLabel: rsRate(floorRate, 'sqft'),
      amount: inr(flooringAmt),
    },
    {
      key: 'toilet-plumbing',
      label: 'Toilet plumbing & sanitary',
      quantityLabel: `${totalToilets} toilet(s)`,
      rateLabel: rsRate(R.plumbingPerToilet, 'toilet'),
      amount: inr(toiletPlumbingAmt),
    },
    {
      key: 'toilet-wet',
      label: 'Toilet waterproofing & wet tiles',
      quantityLabel: `${totalToilets} toilet(s)`,
      rateLabel: rsRate(R.toiletWetWorksPerToilet, 'toilet'),
      amount: inr(toiletWetWorksAmt),
    },
    {
      key: 'kitchen-plumbing',
      label: 'Kitchen plumbing',
      quantityLabel: `${kitchenCount} kitchen(s)`,
      rateLabel: rsRate(R.plumbingKitchenLump, 'kitchen'),
      amount: inr(kitchenPlumbingAmt),
    },
    {
      key: 'electrical',
      label: 'Electrical (wiring / fittings)',
      quantityLabel: `${fmtQty(totalBuiltUpSqft, 0)} sqft`,
      rateLabel: rsRate(R.electricalPerSqftBuiltUp, 'sqft'),
      amount: inr(electricalAmt),
    },
    {
      key: 'doors-windows',
      label: 'Doors & windows',
      quantityLabel: `${totalInternalDoors + 1} doors · ${totalWindows} win`,
      rateLabel: 'std. units',
      amount: inr(doorsWindowsAmt),
    },
    {
      key: 'modular-kitchen',
      label: 'Modular kitchen',
      quantityLabel: `${kitchenCount} kitchen(s) · per-floor BHK`,
      rateLabel: rsRate(R.modularKitchenPerRft, 'rft'),
      amount: inr(modularKitchenAmt),
    },
    {
      key: 'formwork',
      label: 'Formwork / shuttering',
      quantityLabel: `${fmtQty(formworkAreaSqm)} sqm`,
      rateLabel: rsRate(R.formworkPerSqm, 'sqm'),
      amount: inr(formworkAmt),
    },
    {
      key: 'anti-termite',
      label: 'Anti-termite treatment',
      quantityLabel: `${fmtQty(footprintSqft, 0)} sqft footprint`,
      rateLabel: rsRate(R.antiTermitePerSqftFootprint, 'sqft'),
      amount: inr(antiTermiteAmt),
    },
    {
      key: 'soil-fill',
      label: 'Soil filling (upto plinth)',
      quantityLabel: `${fmtQty(soilFillTotal)} cum`,
      rateLabel: rsRate(R.soilFillPerCum, 'cum'),
      amount: inr(soilFillAmt),
    },
  ];

  const finishingTotal = inr(finishingLines.reduce((s, l) => s + l.amount, 0));
  const grandTotal = inr(materialTotal + mistriLabour.amount + finishingTotal);

  return {
    materialLines,
    materialTotal,
    mistriLabour,
    finishingLines,
    finishingTotal,
    grandTotal,
    totalBuiltUpSqft,
    paintedSurfaceSqft,
    flooringAreaSqft,
    formworkAreaSqm,
    soilFillCum: soilFillTotal,
  };
}

/** PDF-safe currency label (Helvetica cannot draw ₹). */
export function formatInr(amount: number): string {
  return rs(amount);
}
