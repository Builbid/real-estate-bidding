// ============================================================
// Material + finishing cost engine (uses quantities × client rates)
// ============================================================

import {
  getExteriorWallPerimeterFt,
  getPlinthExteriorWallAreaSqft,
  getSuperstructureExteriorWallAreaSqft,
} from './calculate';
import {
  STANDARD_FINISH_RATES,
  bathroomsForUnit,
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

function fmtQty(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
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
  // Bottom + two sides (top usually cast with slab)
  const beamForm = beams * (beamW + 2 * beamD) * Math.max(0, beamLenM);

  const slabForm = results.meta.slabAreaSqft * SQFT_TO_SQM;
  const stairForm = results.meta.staircaseAreaSqft * SQFT_TO_SQM * 1.3;
  const footingForm =
    results.meta.footingCount *
    (inputs.footingLengthMm / 1000) *
    (inputs.footingWidthMm / 1000);

  // Multi-floor beam/slab form already scaled via beam count & slab area totals
  void floors;
  return Math.max(0, colForm + beamForm + slabForm + stairForm + footingForm);
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
      rateLabel: `₹${fmtQty(rates.cementPerBag, 0)}/bag`,
      amount: inr(cementAmt),
    },
    {
      key: 'sand',
      label: 'Sand',
      quantityLabel: `${fmtQty(results.sandCum)} cum`,
      rateLabel: `₹${fmtQty(rates.sandPerCum, 0)}/cum`,
      amount: inr(sandAmt),
    },
    {
      key: 'aggregate',
      label: 'Coarse aggregate',
      quantityLabel: `${fmtQty(results.aggregateCum)} cum`,
      rateLabel: `₹${fmtQty(rates.aggregatePerCum, 0)}/cum`,
      amount: inr(aggAmt),
    },
    {
      key: 'bricks',
      label: 'Bricks',
      quantityLabel: `${fmtQty(results.bricks, 0)} nos`,
      rateLabel: `₹${fmtQty(rates.brickPerPiece, 1)}/pc`,
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
      rateLabel: `₹${fmtQty(rate, 0)}/Q`,
      amount: inr(amt),
    });
  }

  const materialTotal = inr(
    cementAmt + sandAmt + aggAmt + brickAmt + steelTotal,
  );

  const mistriAmt = totalBuiltUpSqft * rates.mistriPerSqft;
  const mistriLabour: CostLineItem = {
    key: 'mistri',
    label: 'Mistri / labour (built-up)',
    quantityLabel: `${fmtQty(totalBuiltUpSqft, 0)} sqft`,
    rateLabel: `₹${fmtQty(rates.mistriPerSqft, 0)}/sqft`,
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

  const bathsPerFloor = bathroomsForUnit(inputs.unitType, builtUpPerFloor);
  const totalBaths = bathsPerFloor * Math.max(1, floors);
  const plumbingAmt =
    totalBaths * R.plumbingPerBathroom + Math.max(1, floors) * R.plumbingKitchenLump;

  const electricalAmt = totalBuiltUpSqft * R.electricalPerSqftBuiltUp;

  const doorsPerFloor = doorsPerFloorForUnit(inputs.unitType, builtUpPerFloor);
  const windowsPerFloor = windowsPerFloorForUnit(inputs.unitType, builtUpPerFloor);
  const totalInternalDoors = doorsPerFloor * Math.max(1, floors);
  const totalWindows = windowsPerFloor * Math.max(1, floors);
  const doorsWindowsAmt =
    R.mainDoorLump +
    totalInternalDoors * R.internalDoorEach +
    totalWindows * R.windowEach;

  // One kitchen per dwelling (multi-storey house); if very large multi-floor rental, still 1 kitchen default
  const kitchenRft = kitchenRftForUnit(inputs.unitType, builtUpPerFloor);
  const modularKitchenAmt = kitchenRft * R.modularKitchenPerRft;

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
      rateLabel: `₹${R.paintingPerSqftSurface}/sqft`,
      amount: inr(paintingAmt),
    },
    {
      key: 'flooring',
      label: flooringLabel,
      quantityLabel: `${fmtQty(flooringAreaSqft, 0)} sqft`,
      rateLabel: `₹${floorRate}/sqft`,
      amount: inr(flooringAmt),
    },
    {
      key: 'plumbing',
      label: 'Plumbing (piping / fittings)',
      quantityLabel: `${totalBaths} bath + kitchen`,
      rateLabel: `₹${fmtQty(R.plumbingPerBathroom, 0)}/bath`,
      amount: inr(plumbingAmt),
    },
    {
      key: 'electrical',
      label: 'Electrical (wiring / fittings)',
      quantityLabel: `${fmtQty(totalBuiltUpSqft, 0)} sqft`,
      rateLabel: `₹${R.electricalPerSqftBuiltUp}/sqft`,
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
      quantityLabel: `${kitchenRft} rft · ${inputs.unitType}`,
      rateLabel: `₹${fmtQty(R.modularKitchenPerRft, 0)}/rft`,
      amount: inr(modularKitchenAmt),
    },
    {
      key: 'formwork',
      label: 'Formwork / shuttering',
      quantityLabel: `${fmtQty(formworkAreaSqm)} sqm`,
      rateLabel: `₹${R.formworkPerSqm}/sqm`,
      amount: inr(formworkAmt),
    },
    {
      key: 'anti-termite',
      label: 'Anti-termite treatment',
      quantityLabel: `${fmtQty(footprintSqft, 0)} sqft footprint`,
      rateLabel: `₹${R.antiTermitePerSqftFootprint}/sqft`,
      amount: inr(antiTermiteAmt),
    },
    {
      key: 'soil-fill',
      label: 'Soil filling (upto plinth)',
      quantityLabel: `${fmtQty(soilFillTotal)} cum`,
      rateLabel: `₹${R.soilFillPerCum}/cum`,
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

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
