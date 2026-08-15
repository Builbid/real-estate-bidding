// ============================================================
// Assam Type (modern) material + finishing cost engine
// ============================================================

import { getAssamExteriorPerimeterFt } from './assamCalculate';
import { formatInr, type CostBreakdown, type CostLineItem } from './costs';
import {
  STANDARD_FINISH_RATES,
  bathroomsForUnit,
  doorsPerFloorForUnit,
  kitchenRftForUnit,
  steelRateForDia,
  windowsPerFloorForUnit,
} from './rates';
import type { AssamEstimateInputs, AssamEstimateResults, AssamItemRates, ItemRates } from './types';

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

function asItemRates(rates: AssamItemRates): ItemRates {
  return {
    mistriPerSqft: rates.mistriPerSqft,
    cementPerBag: rates.cementPerBag,
    aggregatePerCum: rates.aggregatePerCum,
    sandPerCum: rates.sandPerCum,
    brickPerPiece: rates.brickPerPiece,
    steelPerQuintalByDia: rates.steelPerQuintalByDia,
    flooringFinish: rates.flooringFinish,
  };
}

export type AssamCostBreakdown = CostBreakdown;

export function calculateAssamCostBreakdown(
  inputs: AssamEstimateInputs,
  results: AssamEstimateResults,
  rates: AssamItemRates,
): AssamCostBreakdown {
  const builtUp = Math.max(0, inputs.builtUpAreaSqft);
  const totalBuiltUpSqft = builtUp;
  const itemRates = asItemRates(rates);

  const cementAmt = results.cementBags * rates.cementPerBag;
  const sandAmt = results.sandCum * rates.sandPerCum;
  const aggAmt = results.aggregateCum * rates.aggregatePerCum;
  const brickAmt = results.bricks * rates.brickPerPiece;
  const tinAmt = results.tinRoofAreaSqft * rates.tinRoofPerSqft;
  const timberAmt = results.timberCft * rates.timberPerCft;
  const steelTrussAmt = results.steelTrussKg * rates.steelTrussPerKg;

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
      label: 'Bricks (9″ plinth + 5″ walls)',
      quantityLabel: `${fmtQty(results.bricks, 0)} nos`,
      rateLabel: rsRate(rates.brickPerPiece, 'pc', 1),
      amount: inr(brickAmt),
    },
  ];

  let steelTotal = 0;
  for (const row of results.steelByDiameter) {
    const rate = steelRateForDia(itemRates, row.diameterMm);
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

  materialLines.push({
    key: 'tin',
    label: 'Tin roof (Dyna / Tata CGI)',
    quantityLabel: `${fmtQty(results.tinRoofAreaSqft, 0)} sqft`,
    rateLabel: rsRate(rates.tinRoofPerSqft, 'sqft'),
    amount: inr(tinAmt),
  });

  if (results.timberCft > 0) {
    materialLines.push({
      key: 'timber',
      label: 'Timber truss',
      quantityLabel: `${fmtQty(results.timberCft)} cft`,
      rateLabel: rsRate(rates.timberPerCft, 'cft'),
      amount: inr(timberAmt),
    });
  }

  if (results.steelTrussKg > 0) {
    materialLines.push({
      key: 'steel-truss',
      label: 'Steel roof truss (fabricated)',
      quantityLabel: `${fmtQty(results.steelTrussKg, 0)} kg`,
      rateLabel: rsRate(rates.steelTrussPerKg, 'kg'),
      amount: inr(steelTrussAmt),
    });
  }

  const materialTotal = inr(
    cementAmt + sandAmt + aggAmt + brickAmt + steelTotal + tinAmt + timberAmt + steelTrussAmt,
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

  const baths = bathroomsForUnit(inputs.unitType, builtUp);
  const plumbingAmt = baths * R.plumbingPerBathroom + R.plumbingKitchenLump;
  const electricalAmt = totalBuiltUpSqft * R.electricalPerSqftBuiltUp;

  const doors = doorsPerFloorForUnit(inputs.unitType, builtUp);
  const windows = windowsPerFloorForUnit(inputs.unitType, builtUp);
  const doorsWindowsAmt =
    R.mainDoorLump + doors * R.internalDoorEach + windows * R.windowEach;

  const kitchenRft = kitchenRftForUnit(inputs.unitType, builtUp);
  const modularKitchenAmt = kitchenRft * R.modularKitchenPerRft;

  const antiTermiteAmt = builtUp * R.antiTermitePerSqftFootprint;

  const perimeterFt = getAssamExteriorPerimeterFt(builtUp);
  const soilFillCum =
    builtUp * SQFT_TO_SQM * Math.max(0, inputs.plinthHeightFt) * FT_TO_M;
  const soilFillTotal =
    soilFillCum * 1.15 +
    perimeterFt * FT_TO_M * 0.45 * 0.6 * Math.max(0, inputs.plinthHeightFt) * FT_TO_M;
  const soilFillAmt = soilFillTotal * R.soilFillPerCum;

  // Light formwork for columns + plinth + lintel + RCC truss (no slab)
  const formworkAreaSqm =
    results.meta.totalColumnHeightFt * FT_TO_M *
      Math.max(0, inputs.columnCount) *
      2 *
      ((inputs.columnWidthMm + inputs.columnDepthMm) / 1000) +
    results.meta.plinthBeamCount *
      ((inputs.plinthBeamWidthMm / 1000) + 2 * (inputs.plinthBeamDepthMm / 1000)) *
      (inputs.avgPlinthBeamLengthFt * FT_TO_M) +
    (0.23 + 2 * 0.15) * (results.meta.lintelLengthFt * FT_TO_M) +
    (inputs.trussType === 'rcc_king_post' ? results.concreteVolumeCum.trusses * 12 : 0);
  const formworkAmt = formworkAreaSqm * R.formworkPerSqm;

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
      quantityLabel: `${baths} bath + kitchen`,
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
      quantityLabel: `${doors + 1} doors · ${windows} win`,
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
      key: 'formwork',
      label: 'Formwork / shuttering',
      quantityLabel: `${fmtQty(formworkAreaSqm)} sqm`,
      rateLabel: rsRate(R.formworkPerSqm, 'sqm'),
      amount: inr(formworkAmt),
    },
    {
      key: 'anti-termite',
      label: 'Anti-termite treatment',
      quantityLabel: `${fmtQty(builtUp, 0)} sqft footprint`,
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

export { formatInr };
