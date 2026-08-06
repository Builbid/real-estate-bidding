'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Download, Calculator, AlertTriangle, RefreshCw, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  calculateEstimate,
  getTotalSlabAreaSqft,
  getAutoWallAreaSqft,
  getExteriorWallAreaSqft,
  getInteriorWallAreaSqft,
  getInteriorWallLengthFtPerFloor,
  getTotalColumnHeightFt,
} from '@/lib/estimate-calculator/calculate';
import { calculateCostBreakdown, formatInr } from '@/lib/estimate-calculator/costs';
import { downloadEstimatePdf } from '@/lib/estimate-calculator/pdf';
import {
  BAR_DIAMETERS,
  BUILT_UP_AREA_INFO,
  DEFAULT_INPUTS,
  INTERIOR_WALL_LENGTH_FT_PER_FLOOR,
  LAP_LENGTH_MULTIPLIER,
  MIX_RATIOS,
  STANDARD_BAR_SPACING_MM,
  STEEL_RATE_DIAMETERS,
  STIRRUP_DIAMETERS,
  UNIT_TYPE_DEFAULT_AREA,
  UNIT_TYPE_DEFAULT_SLAB_AREA,
  type BarDiameter,
  type EstimateInputs,
  type FlooringFinish,
  type FootingType,
  type MixGrade,
  type UnitType,
  type WallThickness,
  type WastagePercent,
} from '@/lib/estimate-calculator/types';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4 | 5;

const PROGRESS_LABELS = [
  'Structure',
  'Columns & Beams',
  'Footing, Slab & Walls',
  'Mix',
  'Rates & Cost',
] as const;

/**
 * Number input that allows clearing the field while typing.
 * Empty stays empty until blur (then falls back to min) — no forced zero mid-edit.
 */
function NumField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix,
  hint,
  labelExtra,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  hint?: string;
  labelExtra?: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : String(value);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            'flex h-11 w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground shadow-sm',
            'ring-offset-background transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-emerald-500/70',
            'dark:bg-card/60',
            suffix && 'pr-12',
          )}
          value={display}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => {
            const t = e.target.value;
            if (t !== '' && !/^-?\d*\.?\d*$/.test(t)) return;
            setDraft(t);
            if (t === '' || t === '-' || t === '.' || t === '-.') return;
            const n = Number(t);
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => {
            if (draft === null || draft === '' || draft === '-' || draft === '.' || draft === '-.') {
              onChange(min);
            } else {
              const n = Number(draft);
              onChange(Number.isFinite(n) ? Math.max(min, n) : min);
            }
            setDraft(null);
          }}
        />
        {suffix && (
          <div className="absolute right-3 text-muted-foreground text-sm pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

function BuiltUpInfoButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="What is built-up area?"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="text-xs max-w-xs leading-relaxed">
        <p className="font-semibold text-foreground mb-1.5">Built-up area</p>
        <p className="text-muted-foreground">{BUILT_UP_AREA_INFO}</p>
      </PopoverContent>
    </Popover>
  );
}

function DiaSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: BarDiameter;
  options: BarDiameter[];
  onChange: (d: BarDiameter) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v) as BarDiameter)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((d) => (
            <SelectItem key={d} value={String(d)}>{d} mm</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function EstimateCalculator() {
  const [step, setStep] = useState<Step>(1);
  const [inputs, setInputs] = useState<EstimateInputs>(DEFAULT_INPUTS);
  const [showResults, setShowResults] = useState(false);

  function update<K extends keyof EstimateInputs>(key: K, value: EstimateInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setShowResults(false);
  }

  function handleUnitType(unitType: UnitType) {
    setInputs((prev) => ({
      ...prev,
      unitType,
      builtUpAreaPerFloorSqft:
        unitType === 'Custom'
          ? prev.builtUpAreaPerFloorSqft
          : UNIT_TYPE_DEFAULT_AREA[unitType],
      slabAreaPerFloorSqft:
        unitType === 'Custom'
          ? prev.slabAreaPerFloorSqft
          : UNIT_TYPE_DEFAULT_SLAB_AREA[unitType],
    }));
    setShowResults(false);
  }

  function updateRate<K extends keyof EstimateInputs['rates']>(
    key: K,
    value: EstimateInputs['rates'][K],
  ) {
    setInputs((prev) => ({
      ...prev,
      rates: { ...prev.rates, [key]: value },
    }));
    setShowResults(false);
  }

  function updateSteelRate(dia: BarDiameter, value: number) {
    setInputs((prev) => ({
      ...prev,
      rates: {
        ...prev.rates,
        steelPerQuintalByDia: {
          ...prev.rates.steelPerQuintalByDia,
          [dia]: value,
        },
      },
    }));
    setShowResults(false);
  }

  const results = useMemo(() => calculateEstimate(inputs), [inputs]);
  const costs = useMemo(
    () => calculateCostBreakdown(inputs, results, inputs.rates),
    [inputs, results],
  );
  const totalSlab = getTotalSlabAreaSqft(inputs);
  const autoWall = getAutoWallAreaSqft(inputs);
  const exteriorWall = getExteriorWallAreaSqft(inputs);
  const interiorWall = getInteriorWallAreaSqft(inputs);
  const interiorLengthPerFloor = getInteriorWallLengthFtPerFloor(
    inputs.unitType,
    inputs.builtUpAreaPerFloorSqft,
  );
  const totalColumnHeightFt = getTotalColumnHeightFt(inputs);
  const colRodTotal = inputs.columnRodsCount1 + inputs.columnRodsCount2;
  const beamRodTotal = inputs.beamRodsCount1 + inputs.beamRodsCount2;

  function goResults() {
    setShowResults(true);
    setStep(5);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-100/90 leading-relaxed">
          This is an approximate material estimate for budgeting purposes based on standard
          Indian civil engineering thumb rules. Please consult a structural engineer for final
          design and quantities.
        </p>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-emerald-600" />
          Material Estimate Calculator
        </h1>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PROGRESS_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0',
                i + 1 < step
                  ? 'bg-emerald-500 text-white'
                  : i + 1 === step
                    ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'bg-secondary text-muted-foreground/80',
              )}
            >
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span
              className={cn(
                'text-[10px] sm:text-xs truncate',
                i + 1 === step ? 'text-foreground font-semibold' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < PROGRESS_LABELS.length - 1 && (
              <div className="h-px flex-1 bg-secondary mx-1 min-w-[8px]" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 pb-6 space-y-5">
          {step === 1 && (
            <>
              <h2 className="text-base font-semibold text-foreground">Structure basics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumField
                  label="Number of floors"
                  value={inputs.floors}
                  min={1}
                  onChange={(n) => update('floors', Math.max(1, Math.floor(n)))}
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Unit type / rooms
                  </label>
                  <Select value={inputs.unitType} onValueChange={(v) => handleUnitType(v as UnitType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1BHK">1BHK</SelectItem>
                      <SelectItem value="2BHK">2BHK</SelectItem>
                      <SelectItem value="3BHK">3BHK</SelectItem>
                      <SelectItem value="4BHK">4BHK</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumField
                  label="Built-up area per floor"
                  value={inputs.builtUpAreaPerFloorSqft}
                  min={0}
                  suffix="sqft"
                  onChange={(n) => update('builtUpAreaPerFloorSqft', Math.max(0, n))}
                  labelExtra={<BuiltUpInfoButton />}
                  hint="For outer walls, flooring bed & footprint. Not the same as slab area."
                />
                <NumField
                  label="Slab area per floor"
                  value={inputs.slabAreaPerFloorSqft}
                  min={0}
                  suffix="sqft"
                  onChange={(n) => update('slabAreaPerFloorSqft', Math.max(0, n))}
                  hint="RCC floor/roof slab plan area. Used for slab concrete, slab steel & ceiling plaster."
                />
                <NumField
                  label="Foundation depth (below ground level)"
                  value={inputs.foundationDepthFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('foundationDepthFt', Math.max(0, n))}
                  hint="Used once here for total column height (steel & concrete)."
                />
                <NumField
                  label="Plinth height"
                  value={inputs.plinthHeightFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('plinthHeightFt', Math.max(0, n))}
                />
                <NumField
                  label="Floor-to-floor / roof height"
                  value={inputs.floorToFloorHeightFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('floorToFloorHeightFt', Math.max(0, n))}
                />
              </div>

              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Total column height: </span>
                {totalColumnHeightFt.toFixed(1)} ft
                <span>
                  {' '}(= foundation {inputs.foundationDepthFt} + plinth {inputs.plinthHeightFt} +{' '}
                  {inputs.floorToFloorHeightFt} × {inputs.floors} floors). Staircase auto-included.
                </span>
              </div>

              <Button size="lg" className="w-full" onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
                Column height locked from Step 1: <span className="font-semibold text-foreground">{totalColumnHeightFt.toFixed(1)} ft</span>
                . Stirrups (Ring) auto @ {STANDARD_BAR_SPACING_MM} mm. Lap/development {LAP_LENGTH_MULTIPLIER}×d added to cutting lengths.
              </div>

              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Columns</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumField
                    label="Number of columns"
                    value={inputs.columnCount}
                    min={0}
                    onChange={(n) => update('columnCount', Math.max(0, Math.floor(n)))}
                  />
                  <NumField
                    label="Column size (width)"
                    value={inputs.columnWidthMm}
                    suffix="mm"
                    onChange={(n) => update('columnWidthMm', Math.max(0, n))}
                  />
                  <NumField
                    label="Column size (depth)"
                    value={inputs.columnDepthMm}
                    suffix="mm"
                    onChange={(n) => update('columnDepthMm', Math.max(0, n))}
                  />
                  <DiaSelect
                    label="Stirrups (Ring) diameter"
                    value={inputs.columnStirrupDiaMm}
                    options={STIRRUP_DIAMETERS}
                    onChange={(d) => update('columnStirrupDiaMm', d)}
                  />
                </div>

                <p className="text-xs font-semibold text-foreground">
                  Main bars — two diameters (total {colRodTotal} nos / column)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <NumField
                    label="Bars type A"
                    value={inputs.columnRodsCount1}
                    min={0}
                    suffix="nos"
                    onChange={(n) => update('columnRodsCount1', Math.max(0, Math.floor(n)))}
                  />
                  <DiaSelect
                    label="Dia A"
                    value={inputs.columnRodDia1Mm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('columnRodDia1Mm', d)}
                  />
                  <NumField
                    label="Bars type B"
                    value={inputs.columnRodsCount2}
                    min={0}
                    suffix="nos"
                    onChange={(n) => update('columnRodsCount2', Math.max(0, Math.floor(n)))}
                    hint="e.g. 4×16 + 4×12"
                  />
                  <DiaSelect
                    label="Dia B"
                    value={inputs.columnRodDia2Mm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('columnRodDia2Mm', d)}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-5 space-y-4">
                <h2 className="text-base font-semibold text-foreground">Beams</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumField
                    label="Total number of beams"
                    value={inputs.beamCount}
                    min={0}
                    onChange={(n) => update('beamCount', Math.max(0, Math.floor(n)))}
                  />
                  <NumField
                    label="Average beam length"
                    value={inputs.avgBeamLengthFt}
                    step={0.5}
                    suffix="ft"
                    onChange={(n) => update('avgBeamLengthFt', Math.max(0, n))}
                  />
                  <NumField
                    label="Beam width"
                    value={inputs.beamWidthMm}
                    suffix="mm"
                    onChange={(n) => update('beamWidthMm', Math.max(0, n))}
                  />
                  <NumField
                    label="Beam depth"
                    value={inputs.beamDepthMm}
                    suffix="mm"
                    onChange={(n) => update('beamDepthMm', Math.max(0, n))}
                  />
                  <DiaSelect
                    label="Stirrups (Ring) diameter"
                    value={inputs.beamStirrupDiaMm}
                    options={STIRRUP_DIAMETERS}
                    onChange={(d) => update('beamStirrupDiaMm', d)}
                  />
                </div>

                <p className="text-xs font-semibold text-foreground">
                  Main bars — two diameters (total {beamRodTotal} nos / beam)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <NumField
                    label="Bars type A"
                    value={inputs.beamRodsCount1}
                    min={0}
                    suffix="nos"
                    onChange={(n) => update('beamRodsCount1', Math.max(0, Math.floor(n)))}
                  />
                  <DiaSelect
                    label="Dia A"
                    value={inputs.beamRodDia1Mm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('beamRodDia1Mm', d)}
                  />
                  <NumField
                    label="Bars type B"
                    value={inputs.beamRodsCount2}
                    min={0}
                    suffix="nos"
                    onChange={(n) => update('beamRodsCount2', Math.max(0, Math.floor(n)))}
                  />
                  <DiaSelect
                    label="Dia B"
                    value={inputs.beamRodDia2Mm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('beamRodDia2Mm', d)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setStep(3)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Footing</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Footing type
                    </label>
                    <Select
                      value={inputs.footingType}
                      onValueChange={(v) => update('footingType', v as FootingType)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="isolated">Isolated</SelectItem>
                        <SelectItem value="combined">Combined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <NumField
                    label="Footing length"
                    value={inputs.footingLengthMm}
                    suffix="mm"
                    onChange={(n) => update('footingLengthMm', Math.max(0, n))}
                  />
                  <NumField
                    label="Footing width"
                    value={inputs.footingWidthMm}
                    suffix="mm"
                    onChange={(n) => update('footingWidthMm', Math.max(0, n))}
                  />
                  <NumField
                    label="Footing depth"
                    value={inputs.footingDepthMm}
                    suffix="mm"
                    onChange={(n) => update('footingDepthMm', Math.max(0, n))}
                  />
                  <DiaSelect
                    label="Footing rod diameter"
                    value={inputs.footingRodDiaMm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('footingRodDiaMm', d)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Footing jali bars auto @ {STANDARD_BAR_SPACING_MM} mm c/c — count = (dim ÷ spacing) + 1 each way.
                  Two-way mesh. Brick soling under footings auto-added.
                </p>
              </div>

              <div className="border-t border-border pt-5 space-y-4">
                <h2 className="text-base font-semibold text-foreground">Slab & staircase</h2>
                <p className="text-[11px] text-muted-foreground">
                  Slab area from Step 1: <span className="font-semibold text-foreground">{inputs.slabAreaPerFloorSqft} sqft/floor</span>
                  {' '}→ total {totalSlab.toFixed(0)} sqft. Steel by bar formula @ {STANDARD_BAR_SPACING_MM} mm c/c (+10% crank allowance).
                  Staircase (~120 sqft/floor @ 150 mm) auto-included. Flooring bricks use built-up area.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumField
                    label="Slab area per floor"
                    value={inputs.slabAreaPerFloorSqft}
                    min={0}
                    suffix="sqft"
                    onChange={(n) => update('slabAreaPerFloorSqft', Math.max(0, n))}
                    hint="Separate from built-up — edit if slab plan differs (balcony, court, etc.)."
                  />
                  <NumField
                    label="Slab thickness"
                    value={inputs.slabThicknessMm}
                    suffix="mm"
                    onChange={(n) => update('slabThicknessMm', Math.max(0, n))}
                  />
                  <DiaSelect
                    label="Main bar diameter"
                    value={inputs.slabMainDiaMm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('slabMainDiaMm', d)}
                  />
                  <DiaSelect
                    label="Distribution bar diameter"
                    value={inputs.slabDistDiaMm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('slabDistDiaMm', d)}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-5 space-y-4">
                <h2 className="text-base font-semibold text-foreground">Walls (bricks + plaster)</h2>
                <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1">
                  <p>
                    Interior ({inputs.unitType}):{' '}
                    {inputs.unitType === 'Custom'
                      ? `≈ ${interiorLengthPerFloor.toFixed(0)} ft/floor`
                      : `${INTERIOR_WALL_LENGTH_FT_PER_FLOOR[inputs.unitType]} ft/floor @ 4.5"`}
                    {' '}· Exterior ≈ {exteriorWall.toFixed(0)} + interior ≈ {interiorWall.toFixed(0)} = {autoWall.toFixed(0)} sqft
                  </p>
                  <p>
                    Plinth (GL → plinth lvl) exterior always 9&quot; full brick · above-plinth exterior uses thickness below.
                  </p>
                  <p>Cement/sand also for brick mortar (1:6) and plaster (1:4 both faces).</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Exterior wall thickness (above plinth)
                    </label>
                    <Select
                      value={inputs.wallThickness}
                      onValueChange={(v) => update('wallThickness', v as WallThickness)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4.5">4.5 inch</SelectItem>
                        <SelectItem value="9">9 inch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <NumField
                    label="Total wall area (override)"
                    value={inputs.wallAreaSqftOverride ?? autoWall}
                    suffix="sqft"
                    onChange={(n) => update('wallAreaSqftOverride', Math.max(0, n))}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setStep(4)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Mix ratio & wastage</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Concrete Mix Ratio (entire structure)
                    </label>
                    <Select
                      value={inputs.mixGrade}
                      onValueChange={(v) => update('mixGrade', v as MixGrade)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(MIX_RATIOS) as MixGrade[]).map((g) => (
                          <SelectItem key={g} value={g}>{MIX_RATIOS[g].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Site wastage / buffer %
                    </label>
                    <Select
                      value={String(inputs.wastagePercent)}
                      onValueChange={(v) => update('wastagePercent', Number(v) as WastagePercent)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5% (default)</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep(3)}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setStep(5)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Item rates</h2>
                <p className="text-[11px] text-muted-foreground">
                  Enter local market rates. Defaults are standard-quality Assam / Tier-2 mid-points — edit as needed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumField
                    label="Mistri rate"
                    value={inputs.rates.mistriPerSqft}
                    suffix="₹/sqft"
                    onChange={(n) => updateRate('mistriPerSqft', Math.max(0, n))}
                    hint="Labour on total built-up area"
                  />
                  <NumField
                    label="Cement rate"
                    value={inputs.rates.cementPerBag}
                    suffix="₹/bag"
                    onChange={(n) => updateRate('cementPerBag', Math.max(0, n))}
                  />
                  <NumField
                    label="Aggregate (Giti) price"
                    value={inputs.rates.aggregatePerCum}
                    suffix="₹/cum"
                    onChange={(n) => updateRate('aggregatePerCum', Math.max(0, n))}
                  />
                  <NumField
                    label="Sand price"
                    value={inputs.rates.sandPerCum}
                    suffix="₹/cum"
                    onChange={(n) => updateRate('sandPerCum', Math.max(0, n))}
                  />
                  <NumField
                    label="Brick price"
                    value={inputs.rates.brickPerPiece}
                    suffix="₹/pc"
                    onChange={(n) => updateRate('brickPerPiece', Math.max(0, n))}
                  />
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Flooring finish
                    </label>
                    <Select
                      value={inputs.rates.flooringFinish}
                      onValueChange={(v) => updateRate('flooringFinish', v as FlooringFinish)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tile">Tile (vitrified)</SelectItem>
                        <SelectItem value="granite">Granite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs font-semibold text-foreground pt-1">
                  Steel price (₹ / quintal) — by diameter
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STEEL_RATE_DIAMETERS.map((dia) => (
                    <NumField
                      key={dia}
                      label={`${dia} mm`}
                      value={inputs.rates.steelPerQuintalByDia[dia] ?? 5700}
                      suffix="₹/Q"
                      onChange={(n) => updateSteelRate(dia, Math.max(0, n))}
                    />
                  ))}
                </div>

                {!showResults && (
                  <Button size="lg" className="w-full" onClick={goResults}>
                    <Calculator className="w-4 h-4" /> Calculate estimate & cost
                  </Button>
                )}
              </div>

              {showResults && (
                <div className="space-y-4 border-t border-border pt-5">
                  <h2 className="text-base font-semibold text-foreground">Material estimate</h2>

                  <div className="rounded-xl border border-border bg-secondary/40 divide-y divide-border overflow-hidden">
                    <ResultRow label="Cement" value={`${results.cementBags} bags`} />
                    <div className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      RCC {results.meta.cementBagsRcc} + brick mortar {results.meta.cementBagsBrickMortar} + plaster (walls + ceiling){' '}
                      {results.meta.cementBagsPlaster} (before wastage)
                    </div>
                    <div className="px-4 py-3 space-y-1.5">
                      <p className="text-xs text-muted-foreground">Steel by diameter (incl. {LAP_LENGTH_MULTIPLIER}d laps)</p>
                      {results.steelByDiameter.map((row) => (
                        <div key={row.diameterMm} className="flex justify-between text-sm">
                          <span className="text-foreground/80">{row.diameterMm} mm</span>
                          <span className="font-semibold tabular-nums">{row.quintals} quintals</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-1 border-t border-border/60">
                        <span className="font-semibold">Total Steel</span>
                        <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {results.totalSteelQuintals} quintals
                        </span>
                      </div>
                    </div>
                    <ResultRow label="Coarse Aggregate (Giti)" value={`${results.aggregateCum} cum`} />
                    <ResultRow label="Sand" value={`${results.sandCum} cum`} />
                    <ResultRow label="Bricks (total)" value={`approx ${results.bricks.toLocaleString('en-IN')} nos`} />
                    <div className="px-4 py-2.5 text-[11px] text-muted-foreground space-y-0.5">
                      <p>Walls {results.meta.bricksWalls.toLocaleString('en-IN')} · Foundation soling {results.meta.bricksFoundationSoling.toLocaleString('en-IN')} · Flooring {results.meta.bricksFlooring.toLocaleString('en-IN')}</p>
                      <p>Concrete: cols {results.concreteVolumeCum.columns} · beams {results.concreteVolumeCum.beams} · footings {results.concreteVolumeCum.footings} · slab {results.concreteVolumeCum.slab} · stair {results.concreteVolumeCum.staircase} = {results.concreteVolumeCum.total} cum</p>
                    </div>
                  </div>

                  <h2 className="text-base font-semibold text-foreground pt-1">Material & labour cost</h2>
                  <div className="rounded-xl border border-border bg-secondary/40 divide-y divide-border overflow-hidden">
                    {costs.materialLines.map((line) => (
                      <ResultRow
                        key={line.key}
                        label={`${line.label} · ${line.quantityLabel}`}
                        value={formatInr(line.amount)}
                      />
                    ))}
                    <ResultRow
                      label={`${costs.mistriLabour.label} · ${costs.mistriLabour.quantityLabel}`}
                      value={formatInr(costs.mistriLabour.amount)}
                    />
                    <ResultRow
                      label="Materials + mistri"
                      value={formatInr(costs.materialTotal + costs.mistriLabour.amount)}
                    />
                  </div>

                  <h2 className="text-base font-semibold text-foreground pt-1">
                    Finishing & allied ({inputs.unitType} · standard quality)
                  </h2>
                  <div className="rounded-xl border border-border bg-secondary/40 divide-y divide-border overflow-hidden">
                    {costs.finishingLines.map((line) => (
                      <div key={line.key} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">{line.label}</span>
                          <span className="text-sm font-bold text-foreground tabular-nums">{formatInr(line.amount)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {line.quantityLabel} · {line.rateLabel}
                        </p>
                      </div>
                    ))}
                    <ResultRow label="Finishing subtotal" value={formatInr(costs.finishingTotal)} />
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>Grand total (approx)</span>
                      <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatInr(costs.grandTotal)}
                      </span>
                    </div>
                    {costs.totalBuiltUpSqft > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        ≈ {formatInr(Math.round(costs.grandTotal / costs.totalBuiltUpSqft))} / sqft built-up
                        ({costs.totalBuiltUpSqft.toLocaleString('en-IN')} sqft)
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Includes {results.wastagePercent}% site wastage · spacing {STANDARD_BAR_SPACING_MM} mm auto · finishing = standard quality norms
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={() => {
                        setShowResults(false);
                        setStep(1);
                      }}
                    >
                      <RefreshCw className="w-4 h-4" /> Recalculate
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1"
                      onClick={() => downloadEstimatePdf(inputs, results)}
                    >
                      <Download className="w-4 h-4" /> Download PDF (tables)
                    </Button>
                  </div>

                  <Button asChild size="lg" variant="secondary" className="w-full">
                    <Link href="/dashboard/owner/new-project">
                      Get an accurate quote from verified builders
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    setShowResults(false);
                    setStep(4);
                  }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground tabular-nums text-right">{value}</span>
    </div>
  );
}
