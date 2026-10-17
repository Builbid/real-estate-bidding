/**
 * Civil / Mistri material quantities from the BuilBid G+0–G+3 Excel RCC footing chart
 * (IS 456:2000, IS 875, IS 1904, IS 13920).
 *
 * Plumbing, electrical, and painting never use this module. Quantities are engineered
 * volumes and bar weights only — no market prices. A ±2% to ±5% wastage note is printed
 * with the result; it is not baked into the figures.
 */

export type BuildingClassCode = 'G+0' | 'G+1' | 'G+2' | 'G+3' | 'G+4+';

export interface MeasuredFloorArea {
  group: string;
  sqft: number;
}

export interface MaterialTotals {
  cementBags: number;
  steelKg: number;
  steelTons: number;
  sandCuFt: number;
  aggregateCuFt: number;
  bricks: number;
}

export interface FloorMaterialEstimate {
  group: string;
  sqft: number;
  materials: MaterialTotals;
}

export interface CivilMaterialEstimate {
  buildingClass: BuildingClassCode;
  storeys: number;
  engineerRequired: boolean;
  chartSummary: string;
  footingCount: number;
  planSqft: number;
  floors: FloorMaterialEstimate[];
  foundation: MaterialTotals;
  totals: MaterialTotals;
  assumptions: string[];
}

interface BarGroup {
  count: number;
  diaMm: number;
}

interface Tier {
  code: Exclude<BuildingClassCode, 'G+4+'>;
  storeys: number;
  footingFt: number;
  footingThickIn: number;
  depthLabel: string;
  meshMm: number;
  meshSpacingMm: number;
  columnBars: BarGroup[];
  columnBarsLabel: string;
  columnWidthIn: number;
  columnDepthIn: number;
  beamWidthIn: number;
  beamDepthIn: number;
  stirrupMm: number;
  stirrupSpacingMm: number;
  concreteGrade: string;
  mix: { cement: number; sand: number; aggregate: number };
  foundation: string;
}

const TIERS: Tier[] = [
  {
    code: 'G+0',
    storeys: 1,
    footingFt: 3.5,
    footingThickIn: 8,
    depthLabel: '4–5 ft',
    meshMm: 10,
    meshSpacingMm: 150,
    columnBars: [{ count: 6, diaMm: 12 }],
    columnBarsLabel: '6 nos. of 12 mm (chart range 4 to 6)',
    columnWidthIn: 9,
    columnDepthIn: 9,
    beamWidthIn: 9,
    beamDepthIn: 12,
    stirrupMm: 8,
    stirrupSpacingMm: 150,
    concreteGrade: 'M20 (1 : 1.5 : 3)',
    mix: { cement: 1, sand: 1.5, aggregate: 3 },
    foundation: 'Isolated footing',
  },
  {
    code: 'G+1',
    storeys: 2,
    footingFt: 4.5,
    footingThickIn: 10,
    depthLabel: '5–6 ft',
    meshMm: 12,
    meshSpacingMm: 125,
    columnBars: [{ count: 6, diaMm: 16 }],
    columnBarsLabel: '6 nos. of 16 mm',
    columnWidthIn: 9,
    columnDepthIn: 12,
    beamWidthIn: 12,
    beamDepthIn: 12,
    stirrupMm: 8,
    stirrupSpacingMm: 125,
    concreteGrade: 'M20 (1 : 1.5 : 3)',
    mix: { cement: 1, sand: 1.5, aggregate: 3 },
    foundation: 'Isolated footing with tie beam',
  },
  {
    code: 'G+2',
    storeys: 3,
    footingFt: 5.5,
    footingThickIn: 10,
    depthLabel: '6–7 ft',
    meshMm: 12,
    meshSpacingMm: 125,
    columnBars: [
      { count: 4, diaMm: 12 },
      { count: 4, diaMm: 16 },
    ],
    columnBarsLabel: '4 nos. of 12 mm and 4 nos. of 16 mm',
    columnWidthIn: 12,
    columnDepthIn: 12,
    beamWidthIn: 12,
    beamDepthIn: 15,
    stirrupMm: 8,
    stirrupSpacingMm: 125,
    concreteGrade: 'M20 (1 : 1.5 : 3)',
    mix: { cement: 1, sand: 1.5, aggregate: 3 },
    foundation: 'Heavy isolated / combined',
  },
  {
    code: 'G+3',
    storeys: 4,
    footingFt: 7,
    footingThickIn: 14,
    depthLabel: '7–8 ft',
    meshMm: 16,
    meshSpacingMm: 125,
    columnBars: [{ count: 8, diaMm: 16 }],
    columnBarsLabel: '8 nos. of 16 mm',
    columnWidthIn: 12,
    columnDepthIn: 15,
    beamWidthIn: 15,
    beamDepthIn: 15,
    stirrupMm: 10,
    stirrupSpacingMm: 125,
    concreteGrade: 'M25 (1 : 1 : 2)',
    mix: { cement: 1, sand: 1, aggregate: 2 },
    foundation: 'Combined / raft foundation',
  },
];

const STOREY_HEIGHT_M = 10 * 0.3048;
const PCC_MIX = { cement: 1, sand: 3, aggregate: 6 };
const MORTAR_MIX = { cement: 1, sand: 6, aggregate: 0 };
const CU_M_TO_CU_FT = 35.3147;

export function isCivilMaterialTrade(tradeKey: string | null | undefined): boolean {
  return tradeKey === 'civil';
}

export function buildingClassForStoreys(storeys: number): BuildingClassCode {
  if (storeys <= 1) return 'G+0';
  if (storeys === 2) return 'G+1';
  if (storeys === 3) return 'G+2';
  if (storeys === 4) return 'G+3';
  return 'G+4+';
}

function tierFor(code: BuildingClassCode): Tier | null {
  return TIERS.find((tier) => tier.code === code) ?? null;
}

function emptyTotals(): MaterialTotals {
  return { cementBags: 0, steelKg: 0, steelTons: 0, sandCuFt: 0, aggregateCuFt: 0, bricks: 0 };
}

function finish(totals: MaterialTotals): MaterialTotals {
  const steelKg = round0(totals.steelKg);
  return {
    cementBags: round1(totals.cementBags),
    steelKg,
    steelTons: round2(steelKg / 1000),
    sandCuFt: round1(totals.sandCuFt),
    aggregateCuFt: round1(totals.aggregateCuFt),
    bricks: round0(totals.bricks),
  };
}

function addTotals(base: MaterialTotals, extra: Partial<MaterialTotals>): MaterialTotals {
  return {
    cementBags: base.cementBags + (extra.cementBags ?? 0),
    steelKg: base.steelKg + (extra.steelKg ?? 0),
    steelTons: 0,
    sandCuFt: base.sandCuFt + (extra.sandCuFt ?? 0),
    aggregateCuFt: base.aggregateCuFt + (extra.aggregateCuFt ?? 0),
    bricks: base.bricks + (extra.bricks ?? 0),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round0(value: number): number {
  return Math.round(value);
}

function steelKgPerMetre(diaMm: number): number {
  return (diaMm * diaMm) / 162;
}

function barsKg(groups: BarGroup[], lengthM: number, copies: number): number {
  return groups.reduce(
    (sum, bar) => sum + copies * bar.count * lengthM * steelKgPerMetre(bar.diaMm),
    0,
  );
}

function mixMaterials(
  volumeM3: number,
  mix: { cement: number; sand: number; aggregate: number },
  dryFactor: number,
): Pick<MaterialTotals, 'cementBags' | 'sandCuFt' | 'aggregateCuFt'> {
  const parts = mix.cement + mix.sand + mix.aggregate;
  if (!(volumeM3 > 0) || !(parts > 0)) {
    return { cementBags: 0, sandCuFt: 0, aggregateCuFt: 0 };
  }
  const dry = volumeM3 * dryFactor;
  const cementM3 = (mix.cement / parts) * dry;
  const sandM3 = (mix.sand / parts) * dry;
  const aggregateM3 = mix.aggregate > 0 ? (mix.aggregate / parts) * dry : 0;
  return {
    cementBags: (cementM3 * 1440) / 50,
    sandCuFt: sandM3 * CU_M_TO_CU_FT,
    aggregateCuFt: aggregateM3 * CU_M_TO_CU_FT,
  };
}

function columnGrid(planSqft: number): { columns: number; beamLengthFt: number; sideFt: number } {
  const sideFt = Math.sqrt(Math.max(planSqft, 1));
  const bays = Math.max(1, Math.ceil(sideFt / 12));
  const lines = bays + 1;
  return {
    columns: lines * lines,
    beamLengthFt: 2 * lines * sideFt,
    sideFt,
  };
}

function meshKg(tier: Tier, footings: number): number {
  const sideM = tier.footingFt * 0.3048;
  const effective = Math.max(0.2, sideM - 0.1);
  const spacingM = tier.meshSpacingMm / 1000;
  const barsEachWay = Math.floor(effective / spacingM) + 1;
  const lengthM = footings * 2 * barsEachWay * effective;
  return lengthM * steelKgPerMetre(tier.meshMm);
}

function stirrupKg(tier: Tier, count: number, lengthEachM: number): number {
  const coverM = 0.04;
  const width = tier.columnWidthIn * 0.0254 - 2 * coverM;
  const depth = tier.columnDepthIn * 0.0254 - 2 * coverM;
  const hook = (2 * 10 * tier.stirrupMm) / 1000;
  const cut = Math.max(0, 2 * (width + depth) + hook);
  const rings = Math.floor((lengthEachM * 1000) / tier.stirrupSpacingMm) + 1;
  return count * rings * cut * steelKgPerMetre(tier.stirrupMm);
}

function masonry(sqft: number): { bricks: number; mortarM3: number } {
  const sideFt = Math.sqrt(Math.max(sqft, 1));
  const net = 0.85;
  const externalM3 = 4 * sideFt * 10 * net * 0.092903 * 0.23;
  const internalM3 = 2 * sideFt * 10 * net * 0.092903 * 0.115;
  const volume = externalM3 + internalM3;
  return { bricks: volume * 500, mortarM3: volume * 0.3 };
}

function foundationMaterials(tier: Tier, planSqft: number): { materials: MaterialTotals; footings: number } {
  const grid = columnGrid(planSqft);
  const footingM3 = grid.columns * (tier.footingFt * 0.3048) ** 2 * (tier.footingThickIn * 0.0254);
  const pccSide = tier.footingFt * 0.3048 + 0.3;
  const pccM3 = grid.columns * pccSide * pccSide * (4 * 0.0254);
  const beamM3 =
    grid.beamLengthFt * 0.3048 * (tier.beamWidthIn * 0.0254) * (tier.beamDepthIn * 0.0254);
  const rcc = mixMaterials(footingM3 + beamM3, tier.mix, 1.54);
  const pcc = mixMaterials(pccM3, PCC_MIX, 1.54);
  const steel =
    meshKg(tier, grid.columns) +
    barsKg([{ count: 4, diaMm: tier.columnBars[0]?.diaMm ?? 12 }], grid.beamLengthFt * 0.3048, 1);
  return {
    footings: grid.columns,
    materials: addTotals(emptyTotals(), {
      cementBags: rcc.cementBags + pcc.cementBags,
      sandCuFt: rcc.sandCuFt + pcc.sandCuFt,
      aggregateCuFt: rcc.aggregateCuFt + pcc.aggregateCuFt,
      steelKg: steel,
    }),
  };
}

function floorSuperstructure(tier: Tier, sqft: number, isGround: boolean): MaterialTotals {
  if (!(sqft > 0)) return emptyTotals();
  const grid = columnGrid(sqft);
  const columnM3 =
    grid.columns *
    STOREY_HEIGHT_M *
    (tier.columnWidthIn * 0.0254) *
    (tier.columnDepthIn * 0.0254);
  const slabM3 = sqft * 0.092903 * 0.125;
  const upperBeamM3 = isGround
    ? 0
    : grid.beamLengthFt * 0.3048 * (tier.beamWidthIn * 0.0254) * (tier.beamDepthIn * 0.0254);
  const concrete = mixMaterials(columnM3 + slabM3 + upperBeamM3, tier.mix, 1.54);
  const walls = masonry(sqft);
  const mortar = mixMaterials(walls.mortarM3, MORTAR_MIX, 1.33);
  const barLength = STOREY_HEIGHT_M + (isGround ? 0.6 : 0);
  const steel =
    barsKg(tier.columnBars, barLength, grid.columns) +
    stirrupKg(tier, grid.columns, STOREY_HEIGHT_M) +
    slabM3 * 0.008 * 7850 +
    (isGround ? 0 : barsKg([{ count: 4, diaMm: tier.columnBars[0]?.diaMm ?? 12 }], grid.beamLengthFt * 0.3048, 1));
  return addTotals(emptyTotals(), {
    cementBags: concrete.cementBags + mortar.cementBags,
    sandCuFt: concrete.sandCuFt + mortar.sandCuFt,
    aggregateCuFt: concrete.aggregateCuFt,
    steelKg: steel,
    bricks: walls.bricks,
  });
}

export function measuredAreasFromLines(
  lines: Array<{ id: string; group: string; unit: string; quantity: number }>,
): MeasuredFloorArea[] {
  const byGroup = new Map<string, number>();
  for (const line of lines) {
    if (!/sq/i.test(line.unit) || !(line.quantity > 0)) continue;
    if (line.id.startsWith('flooring:')) continue;
    const current = byGroup.get(line.group) ?? 0;
    if (line.quantity > current) byGroup.set(line.group, line.quantity);
  }
  if (byGroup.size === 0) {
    for (const line of lines) {
      if (!/sq/i.test(line.unit) || !(line.quantity > 0)) continue;
      const current = byGroup.get(line.group) ?? 0;
      if (line.quantity > current) byGroup.set(line.group, line.quantity);
    }
  }
  return [...byGroup.entries()].map(([group, sqft]) => ({ group, sqft }));
}

export function estimateCivilMaterials(input: {
  measuredFloors: MeasuredFloorArea[];
  declaredStoreys?: number | null;
}): CivilMaterialEstimate | null {
  const floors = input.measuredFloors.filter((floor) => floor.sqft > 0);
  if (floors.length === 0) return null;
  const declared = input.declaredStoreys && input.declaredStoreys > 0 ? Math.round(input.declaredStoreys) : 0;
  const storeys = Math.max(declared, floors.length, 1);
  const buildingClass = buildingClassForStoreys(storeys);
  const planSqft = Math.max(...floors.map((floor) => floor.sqft));
  const engineerRequired = buildingClass === 'G+4+';
  const tier = tierFor(engineerRequired ? 'G+3' : buildingClass);
  if (!tier) return null;

  const foundation = engineerRequired
    ? { footings: 0, materials: emptyTotals() }
    : foundationMaterials(tier, planSqft);

  const floorRows = floors.map((floor, index) => ({
    group: floor.group,
    sqft: round1(floor.sqft),
    materials: finish(floorSuperstructure(tier, floor.sqft, index === 0)),
  }));

  const summed = floorRows.reduce(
    (total, floor) => addTotals(total, floor.materials),
    addTotals(emptyTotals(), foundation.materials),
  );

  const chartSummary = engineerRequired
    ? 'G+4 and above: the BuilBid footing chart has no size. Foundation quantities are not calculated. A structural design engineer (civil) must size the foundation. Superstructure quantities below use the measured areas only as a site guide.'
    : `${tier.code} · ${tier.storeys} storey · footing ${tier.footingFt}×${tier.footingFt} ft × ${tier.footingThickIn} in · excavation ${tier.depthLabel} · PCC 4 in M7.5/M10 · mesh ${tier.meshMm} mm @ ${tier.meshSpacingMm} mm c/c · columns ${tier.columnBarsLabel} · stirrups ${tier.stirrupMm} mm @ ${tier.stirrupSpacingMm} mm · ${tier.concreteGrade} · ${tier.foundation}.`;

  return {
    buildingClass,
    storeys,
    engineerRequired,
    chartSummary,
    footingCount: foundation.footings,
    planSqft: round1(planSqft),
    floors: floorRows,
    foundation: finish(foundation.materials),
    totals: finish(summed),
    assumptions: [
      'Column grid is placed on a 12 ft bay over a square plan of the same area as the largest measured plinth. Length and width are not re-entered.',
      'Storey height used for columns, stirrups, and brickwork is 10 ft. Slab thickness is 125 mm with 0.8% steel because the footing chart does not size slabs.',
      'Brickwork is a 230 mm external wall on the plan perimeter and 115 mm internal walls, with 15% deducted for openings. Mortar is 1:6. Bricks are counted at 500 per cubic metre.',
      'PCC is M10 (1:3:6), 4 in thick, with 150 mm extra beyond each footing edge. RCC uses the chart mix and a dry-volume factor of 1.54.',
      'This is a BuilBid site guide from the Excel RCC footing chart, not a signed structural drawing. Final sizes follow the soil report and the structural engineer.',
    ],
  };
}

export function formatMaterialLine(materials: MaterialTotals): string {
  return [
    `Cement ${materials.cementBags.toLocaleString('en-IN')} bags`,
    `TMT ${materials.steelKg.toLocaleString('en-IN')} kg (${materials.steelTons.toLocaleString('en-IN')} ton)`,
    `Sand ${materials.sandCuFt.toLocaleString('en-IN')} cu. ft.`,
    `Coarse aggregate ${materials.aggregateCuFt.toLocaleString('en-IN')} cu. ft.`,
    `Bricks ${materials.bricks.toLocaleString('en-IN')} nos.`,
  ].join(' · ');
}
