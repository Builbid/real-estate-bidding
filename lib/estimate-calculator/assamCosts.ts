// ============================================================
// Assam Type (semi-pucca) material + finishing cost engine
// ============================================================

import { getAssamExteriorPerimeterFt } from './assamCalculate';
import { formatInr, type CostBreakdown, type CostLineItem } from './costs';
import {
  STANDARD_FINISH_RATES,
  bathroomsForUnit,
  doorsPerFloorForUnit,
  kitchenRftForUnit,
  windowsPerFloorForUnit,
} from './rates';
import type { AssamEstimateInputs, AssamEstimateResults, AssamItemRates } from './types';

const SQFT_TO_SQM = 0.092903;
const FT_TO_M = 0.3048;

function inr(n: number): number {
  return Math.round(n);
}

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

function rsRate(n: number, unit: string, decimals = 0): string {
  return `Rs. ${fmtQty(n, decimals)}/${unit}`;
}

export type AssamCostBreakdown = CostBreakdown;

export function calculateAssamCostBreakdown(
  inputs: AssamEstimateInputs,
  results: AssamEstimateResults,
  rates: AssamItemRates,
): AssamCostBreakdown {
  const floors = Math.max(1, Math.floor(inputs.floors));
  const builtUpPerFloor = Math.max(0, inputs.builtUpAreaPerFloorSqft);
  const totalBuiltUpSqft = builtUpPerFloor * floors;

  const cementAmt = results.cementBags * rates.cementPerBag;
  const sandAmt = results.sandCum * rates.sandPerCum;
  const aggAmt = results.aggregateCum * rates.aggregatePerCum;
  const brickAmt = results.bricks * rates.brickPerPiece;
  const timberAmt = results.timberCft * rates.timberPerCft;
  const cgiAmt = results.cgiAreaSqft * rates.cgiPerSqft;
  const panelAmt = results.wallPanelAreaSqft * rates.wallPanelPerSqft;

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
      label: 'Coarse aggregate (PCC pedestals)',
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
    {
      key: 'timber',
      label: 'Timber (posts, bands, roof)',
      quantityLabel: `${fmtQty(results.timberCft)} cft`,
      rateLabel: rsRate(rates.timberPerCft, 'cft'),
      amount: inr(timberAmt),
    },
    {
      key: 'cgi',
      label: 'CGI roofing sheets',
      quantityLabel: `${fmtQty(results.cgiAreaSqft, 0)} sqft`,
      rateLabel: rsRate(rates.cgiPerSqft, 'sqft'),
      amount: inr(cgiAmt),
    },
    {
      key: 'wall-panel',
      label: 'Bamboo / mesh wall panels',
      quantityLabel: `${fmtQty(results.wallPanelAreaSqft, 0)} sqft`,
      rateLabel: rsRate(rates.wallPanelPerSqft, 'sqft'),
      amount: inr(panelAmt),
    },
  ];

  const materialTotal = inr(
    cementAmt + sandAmt + aggAmt + brickAmt + timberAmt + cgiAmt + panelAmt,
  );

  const mistriAmt = totalBuiltUpSqft * rates.mistriPerSqft;
  const mistriLabour: CostLineItem = {
    key: 'mistri',
    label: 'Mistri / labour (built-up)',
    quantityLabel: `${fmtQty(totalBuiltUpSqft, 0)} sqft`,
    rateLabel: rsRate(rates.mistriPerSqft, 'sqft'),
    amount: inr(mistriAmt),
  };

  const R = STANDARD_FINISH_RATES;
  const paintedSurfaceSqft = results.plasterAreaSqft * 0.9;
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
  const totalBaths = bathsPerFloor * floors;
  const plumbingAmt =
    totalBaths * R.plumbingPerBathroom + floors * R.plumbingKitchenLump;

  const electricalAmt = totalBuiltUpSqft * R.electricalPerSqftBuiltUp;

  const doorsPerFloor = doorsPerFloorForUnit(inputs.unitType, builtUpPerFloor);
  const windowsPerFloor = windowsPerFloorForUnit(inputs.unitType, builtUpPerFloor);
  const totalInternalDoors = doorsPerFloor * floors;
  const totalWindows = windowsPerFloor * floors;
  const doorsWindowsAmt =
    R.mainDoorLump +
    totalInternalDoors * R.internalDoorEach +
    totalWindows * R.windowEach;

  const kitchenRft = kitchenRftForUnit(inputs.unitType, builtUpPerFloor);
  const modularKitchenAmt = kitchenRft * R.modularKitchenPerRft;

  const footprintSqft = builtUpPerFloor;
  const antiTermiteAmt = footprintSqft * R.antiTermitePerSqftFootprint;

  const perimeterFt = getAssamExteriorPerimeterFt(builtUpPerFloor);
  const soilFillCum =
    footprintSqft * SQFT_TO_SQM * Math.max(0, inputs.plinthHeightFt) * FT_TO_M;
  const soilFillTotal =
    soilFillCum * 1.15 +
    perimeterFt * FT_TO_M * 0.45 * 0.6 * Math.max(0, inputs.plinthHeightFt) * FT_TO_M;
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
      key: 'plumbing',
      label: 'Plumbing (piping / fittings)',
      quantityLabel: `${totalBaths} bath + kitchen`,
      rateLabel: rsRate(R.plumbingPerBathroom, 'bath'),
      amount: inr(plumbingAmt),
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
      quantityLabel: `${kitchenRft} rft · ${inputs.unitType}`,
      rateLabel: rsRate(R.modularKitchenPerRft, 'rft'),
      amount: inr(modularKitchenAmt),
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
    formworkAreaSqm: 0,
    soilFillCum: soilFillTotal,
  };
}

export { formatInr };
