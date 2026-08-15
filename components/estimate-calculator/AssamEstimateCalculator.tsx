'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Download, Calculator, RefreshCw, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  calculateAssamEstimate,
  getAssamTotalColumnHeightFt,
} from '@/lib/estimate-calculator/assamCalculate';
import { calculateAssamCostBreakdown, formatInr } from '@/lib/estimate-calculator/assamCosts';
import { downloadAssamEstimatePdf } from '@/lib/estimate-calculator/assamPdf';
import { LINTEL_STANDARD } from '@/lib/estimate-calculator/calculate';
import {
  BAR_DIAMETERS,
  BUILT_UP_AREA_INFO,
  DEFAULT_ASSAM_INPUTS,
  LAP_LENGTH_MULTIPLIER,
  MIX_RATIOS,
  STANDARD_BAR_SPACING_MM,
  STEEL_RATE_DIAMETERS,
  STIRRUP_DIAMETERS,
  UNIT_TYPE_DEFAULT_AREA,
  type AssamEstimateInputs,
  type AssamTrussType,
  type BarDiameter,
  type FlooringFinish,
  type FootingType,
  type MixGrade,
  type UnitType,
  type WastagePercent,
} from '@/lib/estimate-calculator/types';
import { cn } from '@/lib/utils';

type AssamStep = 1 | 2 | 3 | 4;

const PROGRESS_LABELS = ['Plan & roof', 'Columns & footing', 'Plinth beams', 'Rates & Cost'] as const;

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
            suffix && 'pr-14',
          )}
          value={display}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '' || raw === '-' || raw === '.') {
              setDraft(raw);
              return;
            }
            if (!/^-?\d*\.?\d*$/.test(raw)) return;
            setDraft(raw);
            const n = Number(raw);
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => {
            setDraft(null);
            if (!Number.isFinite(value) || value < min) onChange(min);
          }}
        />
        {suffix && (
          <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
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
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
          aria-label="Built-up area info"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-xs leading-relaxed max-w-xs" align="start">
        {BUILT_UP_AREA_INFO}
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

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground tabular-nums text-right">{value}</span>
    </div>
  );
}

export function AssamEstimateCalculator({ onChangeType }: { onChangeType: () => void }) {
  const [step, setStep] = useState<AssamStep>(1);
  const [inputs, setInputs] = useState<AssamEstimateInputs>(DEFAULT_ASSAM_INPUTS);
  const [showResults, setShowResults] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const skipScrollOnMount = useRef(true);

  useEffect(() => {
    if (skipScrollOnMount.current) {
      skipScrollOnMount.current = false;
      return;
    }
    const el = topRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }, [step]);

  useEffect(() => {
    if (!showResults) return;
    const id = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => window.clearTimeout(id);
  }, [showResults]);

  function update<K extends keyof AssamEstimateInputs>(key: K, value: AssamEstimateInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setShowResults(false);
  }

  function handleUnitType(unitType: UnitType) {
    setInputs((prev) => ({
      ...prev,
      unitType,
      builtUpAreaSqft:
        unitType === 'Custom' ? prev.builtUpAreaSqft : UNIT_TYPE_DEFAULT_AREA[unitType],
    }));
    setShowResults(false);
  }

  function updateRate<K extends keyof AssamEstimateInputs['rates']>(
    key: K,
    value: AssamEstimateInputs['rates'][K],
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

  const results = useMemo(() => calculateAssamEstimate(inputs), [inputs]);
  const costs = useMemo(
    () => calculateAssamCostBreakdown(inputs, results, inputs.rates),
    [inputs, results],
  );
  const totalColumnHeightFt = getAssamTotalColumnHeightFt(inputs);
  const colRodTotal = inputs.columnRodsCount1 + inputs.columnRodsCount2;
  const pbRodTotal = inputs.plinthBeamRodsCount1 + inputs.plinthBeamRodsCount2;

  function goResults() {
    setShowResults(true);
    setStep(4);
  }

  return (
    <div ref={topRef} className="space-y-5 scroll-mt-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Assam Type · Single storey
          </p>
          <h2 className="text-base font-semibold text-foreground mt-0.5">
            RCC frame + 5″ brick + tin roof (no slab)
          </h2>
        </div>
        <Button type="button" variant="ghost" size="sm" className="text-xs shrink-0" onClick={onChangeType}>
          Change type
        </Button>
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
              <h2 className="text-base font-semibold text-foreground">Plan & roof</h2>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Single-floor Assam Type only. Structure like RCC ground floor — footing, columns, plinth beam,
                lintel, 9″ plinth + 5″ brick walls — but tin roof on trusses instead of slab / floor beams.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  label="Built-up area"
                  value={inputs.builtUpAreaSqft}
                  min={0}
                  suffix="sqft"
                  onChange={(n) => update('builtUpAreaSqft', Math.max(0, n))}
                  labelExtra={<BuiltUpInfoButton />}
                />
                <NumField
                  label="Foundation depth (below GL)"
                  value={inputs.foundationDepthFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('foundationDepthFt', Math.max(0, n))}
                />
                <NumField
                  label="Plinth height (9″ brick)"
                  value={inputs.plinthHeightFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('plinthHeightFt', Math.max(0, n))}
                />
                <NumField
                  label="Wall height above plinth (5″ brick)"
                  value={inputs.wallHeightFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('wallHeightFt', Math.max(0, n))}
                  hint="Floor to eaves — brick walls to roof."
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Roof truss type
                  </label>
                  <Select
                    value={inputs.trussType}
                    onValueChange={(v) => update('trussType', v as AssamTrussType)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rcc_king_post">RCC King Post truss</SelectItem>
                      <SelectItem value="steel">Steel roof truss</SelectItem>
                      <SelectItem value="timber">Timber truss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumField
                  label="Truss spacing"
                  value={inputs.trussSpacingFt}
                  min={6}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('trussSpacingFt', Math.max(6, n))}
                />
                <NumField
                  label="Tin roof pitch factor"
                  value={inputs.tinPitchFactor}
                  min={1}
                  step={0.05}
                  onChange={(n) => update('tinPitchFactor', Math.max(1, n))}
                  hint="Sloping tin area ÷ plan (Dyna / coloured Tata CGI)."
                />
                <NumField
                  label="Tin sheet wastage"
                  value={inputs.tinWastagePercent}
                  min={0}
                  suffix="%"
                  onChange={(n) => update('tinWastagePercent', Math.max(0, n))}
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Concrete mix
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
                    Site wastage
                  </label>
                  <Select
                    value={String(inputs.wastagePercent)}
                    onValueChange={(v) => update('wastagePercent', Number(v) as WastagePercent)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5 text-xs text-muted-foreground">
                Preview: ~{results.meta.trussCount} trusses · tin ~{results.tinRoofAreaSqft} sqft · lintel auto{' '}
                {LINTEL_STANDARD.widthMm}×{LINTEL_STANDARD.depthMm} mm
              </div>

              <Button size="lg" className="w-full" onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-base font-semibold text-foreground">RCC columns & footing</h2>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Column height locked from plan:{' '}
                <span className="font-semibold text-foreground">{totalColumnHeightFt.toFixed(1)} ft</span>
                {' '}(foundation + plinth + wall).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumField
                  label="Number of columns"
                  value={inputs.columnCount}
                  min={0}
                  onChange={(n) => update('columnCount', Math.max(0, Math.floor(n)))}
                />
                <NumField
                  label="Column width"
                  value={inputs.columnWidthMm}
                  min={150}
                  suffix="mm"
                  onChange={(n) => update('columnWidthMm', Math.max(150, Math.floor(n)))}
                />
                <NumField
                  label="Column depth"
                  value={inputs.columnDepthMm}
                  min={150}
                  suffix="mm"
                  onChange={(n) => update('columnDepthMm', Math.max(150, Math.floor(n)))}
                />
                <NumField
                  label="Main bars — count"
                  value={inputs.columnRodsCount1}
                  min={0}
                  onChange={(n) => update('columnRodsCount1', Math.max(0, Math.floor(n)))}
                />
                <DiaSelect
                  label="Main bars — dia"
                  value={inputs.columnRodDia1Mm}
                  options={BAR_DIAMETERS}
                  onChange={(d) => update('columnRodDia1Mm', d)}
                />
                <NumField
                  label="Secondary bars — count"
                  value={inputs.columnRodsCount2}
                  min={0}
                  onChange={(n) => update('columnRodsCount2', Math.max(0, Math.floor(n)))}
                />
                <DiaSelect
                  label="Secondary bars — dia"
                  value={inputs.columnRodDia2Mm}
                  options={BAR_DIAMETERS}
                  onChange={(d) => update('columnRodDia2Mm', d)}
                />
                <DiaSelect
                  label="Stirrup dia"
                  value={inputs.columnStirrupDiaMm}
                  options={STIRRUP_DIAMETERS}
                  onChange={(d) => update('columnStirrupDiaMm', d)}
                />
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
                  min={300}
                  suffix="mm"
                  onChange={(n) => update('footingLengthMm', Math.max(300, Math.floor(n)))}
                />
                <NumField
                  label="Footing width"
                  value={inputs.footingWidthMm}
                  min={300}
                  suffix="mm"
                  onChange={(n) => update('footingWidthMm', Math.max(300, Math.floor(n)))}
                />
                <NumField
                  label="Footing depth"
                  value={inputs.footingDepthMm}
                  min={150}
                  suffix="mm"
                  onChange={(n) => update('footingDepthMm', Math.max(150, Math.floor(n)))}
                />
                <DiaSelect
                  label="Footing jali dia"
                  value={inputs.footingRodDiaMm}
                  options={BAR_DIAMETERS}
                  onChange={(d) => update('footingRodDiaMm', d)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {colRodTotal} bars/col · stirrups @ {STANDARD_BAR_SPACING_MM} mm · footings{' '}
                {results.meta.footingCount}
              </p>
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
              <h2 className="text-base font-semibold text-foreground">Plinth beams</h2>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Ground / plinth beams only — no floor or roof beams. Lintel band is calculated automatically.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumField
                  label="Plinth beam count"
                  value={inputs.plinthBeamCount}
                  min={0}
                  onChange={(n) => update('plinthBeamCount', Math.max(0, Math.floor(n)))}
                />
                <NumField
                  label="Avg beam length"
                  value={inputs.avgPlinthBeamLengthFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('avgPlinthBeamLengthFt', Math.max(0, n))}
                />
                <NumField
                  label="Beam width"
                  value={inputs.plinthBeamWidthMm}
                  min={150}
                  suffix="mm"
                  onChange={(n) => update('plinthBeamWidthMm', Math.max(150, Math.floor(n)))}
                />
                <NumField
                  label="Beam depth"
                  value={inputs.plinthBeamDepthMm}
                  min={150}
                  suffix="mm"
                  onChange={(n) => update('plinthBeamDepthMm', Math.max(150, Math.floor(n)))}
                />
                <NumField
                  label="Bottom / set-1 bars"
                  value={inputs.plinthBeamRodsCount1}
                  min={0}
                  onChange={(n) => update('plinthBeamRodsCount1', Math.max(0, Math.floor(n)))}
                />
                <DiaSelect
                  label="Set-1 dia"
                  value={inputs.plinthBeamRodDia1Mm}
                  options={BAR_DIAMETERS}
                  onChange={(d) => update('plinthBeamRodDia1Mm', d)}
                />
                <NumField
                  label="Top / set-2 bars"
                  value={inputs.plinthBeamRodsCount2}
                  min={0}
                  onChange={(n) => update('plinthBeamRodsCount2', Math.max(0, Math.floor(n)))}
                />
                <DiaSelect
                  label="Set-2 dia"
                  value={inputs.plinthBeamRodDia2Mm}
                  options={BAR_DIAMETERS}
                  onChange={(d) => update('plinthBeamRodDia2Mm', d)}
                />
                <DiaSelect
                  label="Stirrup dia"
                  value={inputs.plinthBeamStirrupDiaMm}
                  options={STIRRUP_DIAMETERS}
                  onChange={(d) => update('plinthBeamStirrupDiaMm', d)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {pbRodTotal} bars/beam · lintel length {results.meta.lintelLengthFt} ft (auto)
              </p>
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
              <h2 className="text-base font-semibold text-foreground">Rates & cost</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumField
                  label="Mistri rate"
                  value={inputs.rates.mistriPerSqft}
                  suffix="₹/sqft"
                  onChange={(n) => updateRate('mistriPerSqft', Math.max(0, n))}
                  hint="Labour = built-up sqft × this rate"
                />
                <NumField
                  label="Cement rate"
                  value={inputs.rates.cementPerBag}
                  suffix="₹/bag"
                  onChange={(n) => updateRate('cementPerBag', Math.max(0, n))}
                />
                <NumField
                  label="Sand price"
                  value={inputs.rates.sandPerCum}
                  suffix="₹/cum"
                  onChange={(n) => updateRate('sandPerCum', Math.max(0, n))}
                />
                <NumField
                  label="Aggregate (Giti)"
                  value={inputs.rates.aggregatePerCum}
                  suffix="₹/cum"
                  onChange={(n) => updateRate('aggregatePerCum', Math.max(0, n))}
                />
                <NumField
                  label="Brick price"
                  value={inputs.rates.brickPerPiece}
                  suffix="₹/pc"
                  onChange={(n) => updateRate('brickPerPiece', Math.max(0, n))}
                />
                <NumField
                  label="Tin roof (Dyna / Tata CGI)"
                  value={inputs.rates.tinRoofPerSqft}
                  suffix="₹/sqft"
                  onChange={(n) => updateRate('tinRoofPerSqft', Math.max(0, n))}
                />
                {inputs.trussType === 'timber' && (
                  <NumField
                    label="Timber (truss)"
                    value={inputs.rates.timberPerCft}
                    suffix="₹/cft"
                    onChange={(n) => updateRate('timberPerCft', Math.max(0, n))}
                  />
                )}
                {inputs.trussType === 'steel' && (
                  <NumField
                    label="Steel roof truss (fabricated)"
                    value={inputs.rates.steelTrussPerKg}
                    suffix="₹/kg"
                    onChange={(n) => updateRate('steelTrussPerKg', Math.max(0, n))}
                  />
                )}
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
                  <Calculator className="w-4 h-4" /> Calculate Assam Type estimate
                </Button>
              )}

              {showResults && (
                <div
                  ref={resultsRef}
                  className="space-y-4 border-t border-border pt-5 scroll-mt-24"
                >
                  <h2 className="text-base font-semibold text-foreground">Material estimate</h2>
                  <div className="rounded-xl border border-border bg-secondary/40 divide-y divide-border overflow-hidden">
                    <ResultRow label="Cement" value={`${results.cementBags} bags`} />
                    <div className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      RCC {results.meta.cementBagsRcc} + brick mortar {results.meta.cementBagsBrickMortar} + plaster{' '}
                      {results.meta.cementBagsPlaster} (before wastage)
                    </div>
                    <div className="px-4 py-3 space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        Steel by diameter (incl. {LAP_LENGTH_MULTIPLIER}d laps)
                      </p>
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
                    <ResultRow
                      label="Bricks (total)"
                      value={`approx ${results.bricks.toLocaleString('en-IN')} nos`}
                    />
                    <div className="px-4 py-2.5 text-[11px] text-muted-foreground space-y-0.5">
                      <p>
                        Walls {results.meta.bricksWalls.toLocaleString('en-IN')} · Foundation soling{' '}
                        {results.meta.bricksFoundationSoling.toLocaleString('en-IN')} · Flooring{' '}
                        {results.meta.bricksFlooring.toLocaleString('en-IN')}
                      </p>
                      <p>
                        Concrete: cols {results.concreteVolumeCum.columns} · plinth{' '}
                        {results.concreteVolumeCum.plinthBeams} · lintels {results.concreteVolumeCum.lintels} ·
                        footings {results.concreteVolumeCum.footings}
                        {inputs.trussType === 'rcc_king_post'
                          ? ` · RCC trusses ${results.concreteVolumeCum.trusses}`
                          : ''}{' '}
                        = {results.concreteVolumeCum.total} cum
                      </p>
                      <p>
                        Tin roof {results.tinRoofAreaSqft} sqft · {results.meta.trussCount}{' '}
                        {inputs.trussType === 'rcc_king_post'
                          ? 'RCC king-post'
                          : inputs.trussType === 'steel'
                            ? 'steel roof'
                            : 'timber'}{' '}
                        trusses
                        {results.timberCft > 0 ? ` · timber ${results.timberCft} cft` : ''}
                        {results.steelTrussKg > 0
                          ? ` · steel truss ${results.steelTrussKg} kg`
                          : ''}
                      </p>
                      <p>No slab · no floor beams</p>
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
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatInr(line.amount)}
                          </span>
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
                        ≈ {formatInr(Math.round(costs.grandTotal / costs.totalBuiltUpSqft))} / sqft
                        built-up ({costs.totalBuiltUpSqft.toLocaleString('en-IN')} sqft)
                      </p>
                    )}
                  </div>

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
                      onClick={() => downloadAssamEstimatePdf(inputs, results)}
                    >
                      <Download className="w-4 h-4" /> Download PDF
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
                    setStep(3);
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
