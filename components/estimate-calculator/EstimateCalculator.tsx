'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Download, Calculator, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  calculateEstimate,
  getAutoSlabAreaSqft,
  getAutoWallAreaSqft,
} from '@/lib/estimate-calculator/calculate';
import { downloadEstimatePdf } from '@/lib/estimate-calculator/pdf';
import {
  BAR_DIAMETERS,
  DEFAULT_INPUTS,
  MIX_RATIOS,
  STIRRUP_DIAMETERS,
  UNIT_TYPE_DEFAULT_AREA,
  type BarDiameter,
  type EstimateInputs,
  type FootingType,
  type MixGrade,
  type UnitType,
  type WallThickness,
  type WastagePercent,
} from '@/lib/estimate-calculator/types';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4;

const PROGRESS_LABELS = [
  'Structure',
  'Columns & Beams',
  'Footing, Slab & Walls',
  'Mix & Results',
] as const;

function NumField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Input
        label={label}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ''}
        suffix={suffix}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(0);
            return;
          }
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
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
    }));
    setShowResults(false);
  }

  const results = useMemo(() => calculateEstimate(inputs), [inputs]);
  const autoSlab = getAutoSlabAreaSqft(inputs);
  const autoWall = getAutoWallAreaSqft(inputs);

  function goResults() {
    setShowResults(true);
    setStep(4);
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
        <p className="text-sm text-muted-foreground mt-1">
          Enter building parameters to get approximate cement, steel, sand, aggregate & brick quantities.
        </p>
      </div>

      {/* Progress */}
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
          {/* ── Step 1: Structure ── */}
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
                  label="Built-up / slab area per floor"
                  value={inputs.builtUpAreaPerFloorSqft}
                  min={1}
                  suffix="sqft"
                  onChange={(n) => update('builtUpAreaPerFloorSqft', Math.max(0, n))}
                  hint={
                    inputs.unitType === 'Custom'
                      ? 'Enter your actual built-up area per floor.'
                      : `Default for ${inputs.unitType} — edit if your plan differs.`
                  }
                />
                <NumField
                  label="Foundation depth"
                  value={inputs.foundationDepthFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('foundationDepthFt', Math.max(0, n))}
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
              <Button size="lg" className="w-full" onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* ── Step 2: Columns & Beams ── */}
          {step === 2 && (
            <>
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
                    label="Column width"
                    value={inputs.columnWidthMm}
                    suffix="mm"
                    onChange={(n) => update('columnWidthMm', Math.max(0, n))}
                    hint="Default 300 × 300 mm"
                  />
                  <NumField
                    label="Column depth"
                    value={inputs.columnDepthMm}
                    suffix="mm"
                    onChange={(n) => update('columnDepthMm', Math.max(0, n))}
                  />
                  <NumField
                    label="Rods per column"
                    value={inputs.rodsPerColumn}
                    min={0}
                    onChange={(n) => update('rodsPerColumn', Math.max(0, Math.floor(n)))}
                  />
                  <DiaSelect
                    label="Column rod diameter"
                    value={inputs.columnRodDiaMm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('columnRodDiaMm', d)}
                  />
                  <DiaSelect
                    label="Stirrup / tie diameter"
                    value={inputs.columnStirrupDiaMm}
                    options={STIRRUP_DIAMETERS}
                    onChange={(d) => update('columnStirrupDiaMm', d)}
                  />
                  <NumField
                    label="Stirrup spacing"
                    value={inputs.columnStirrupSpacingMm}
                    suffix="mm"
                    onChange={(n) => update('columnStirrupSpacingMm', Math.max(1, n))}
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
                    label="Beam width"
                    value={inputs.beamWidthMm}
                    suffix="mm"
                    onChange={(n) => update('beamWidthMm', Math.max(0, n))}
                    hint="Default 230 × 300 mm"
                  />
                  <NumField
                    label="Beam depth"
                    value={inputs.beamDepthMm}
                    suffix="mm"
                    onChange={(n) => update('beamDepthMm', Math.max(0, n))}
                  />
                  <NumField
                    label="Average beam length"
                    value={inputs.avgBeamLengthFt}
                    step={0.5}
                    suffix="ft"
                    onChange={(n) => update('avgBeamLengthFt', Math.max(0, n))}
                  />
                  <NumField
                    label="Rods per beam"
                    value={inputs.rodsPerBeam}
                    min={0}
                    onChange={(n) => update('rodsPerBeam', Math.max(0, Math.floor(n)))}
                  />
                  <DiaSelect
                    label="Beam rod diameter"
                    value={inputs.beamRodDiaMm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('beamRodDiaMm', d)}
                  />
                  <DiaSelect
                    label="Beam stirrup diameter"
                    value={inputs.beamStirrupDiaMm}
                    options={STIRRUP_DIAMETERS}
                    onChange={(d) => update('beamStirrupDiaMm', d)}
                  />
                  <NumField
                    label="Beam stirrup spacing"
                    value={inputs.beamStirrupSpacingMm}
                    suffix="mm"
                    onChange={(n) => update('beamStirrupSpacingMm', Math.max(1, n))}
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

          {/* ── Step 3: Footing, Slab, Walls ── */}
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
                    hint="Default 1200 × 1200 × 300 mm"
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
                  <NumField
                    label="Rods per footing (one way)"
                    value={inputs.rodsPerFootingOneWay}
                    min={0}
                    onChange={(n) => update('rodsPerFootingOneWay', Math.max(0, Math.floor(n)))}
                    hint="Two-way mesh: this count is doubled in the calculation."
                  />
                  <DiaSelect
                    label="Footing rod diameter"
                    value={inputs.footingRodDiaMm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('footingRodDiaMm', d)}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-5 space-y-4">
                <h2 className="text-base font-semibold text-foreground">Slab</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumField
                    label="Slab thickness"
                    value={inputs.slabThicknessMm}
                    suffix="mm"
                    onChange={(n) => update('slabThicknessMm', Math.max(0, n))}
                  />
                  <NumField
                    label="Slab area (override)"
                    value={inputs.slabAreaSqftOverride ?? autoSlab}
                    suffix="sqft"
                    onChange={(n) => update('slabAreaSqftOverride', Math.max(0, n))}
                    hint={`Auto: ${autoSlab.toFixed(0)} sqft (built-up × floors). Edit to override.`}
                  />
                  <DiaSelect
                    label="Main bar diameter"
                    value={inputs.slabMainDiaMm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('slabMainDiaMm', d)}
                  />
                  <NumField
                    label="Main bar spacing"
                    value={inputs.slabMainSpacingMm}
                    suffix="mm c/c"
                    onChange={(n) => update('slabMainSpacingMm', Math.max(1, n))}
                    hint="Steel weight uses 100 kg/cum thumb rule; spacing is for reference."
                  />
                  <DiaSelect
                    label="Distribution bar diameter"
                    value={inputs.slabDistDiaMm}
                    options={BAR_DIAMETERS}
                    onChange={(d) => update('slabDistDiaMm', d)}
                  />
                  <NumField
                    label="Distribution bar spacing"
                    value={inputs.slabDistSpacingMm}
                    suffix="mm c/c"
                    onChange={(n) => update('slabDistSpacingMm', Math.max(1, n))}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-5 space-y-4">
                <h2 className="text-base font-semibold text-foreground">Walls (bricks)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Wall thickness
                    </label>
                    <Select
                      value={inputs.wallThickness}
                      onValueChange={(v) => update('wallThickness', v as WallThickness)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4.5">4.5 inch (half brick)</SelectItem>
                        <SelectItem value="9">9 inch (full brick)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <NumField
                    label="Total wall area"
                    value={inputs.wallAreaSqftOverride ?? autoWall}
                    suffix="sqft"
                    onChange={(n) => update('wallAreaSqftOverride', Math.max(0, n))}
                    hint="Auto-estimated from square footprint × height × floors × 0.8 (openings). Enter manually for better accuracy if known."
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

          {/* ── Step 4: Mix + Results ── */}
          {step === 4 && (
            <>
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Mix ratio & wastage</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Concrete Mix Ratio (applies to entire structure)
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
                    <p className="text-[11px] text-muted-foreground">
                      Same mix for footing, columns, beams, and slab (budgeting simplification).
                    </p>
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
                    <p className="text-[11px] text-muted-foreground">
                      Applied only to final cement, steel, sand, aggregate & brick outputs.
                    </p>
                  </div>
                </div>

                {!showResults && (
                  <Button size="lg" className="w-full" onClick={goResults}>
                    <Calculator className="w-4 h-4" /> Calculate estimate
                  </Button>
                )}
              </div>

              {showResults && (
                <div className="space-y-4 border-t border-border pt-5">
                  <h2 className="text-base font-semibold text-foreground">Material estimate</h2>

                  <div className="rounded-xl border border-border bg-secondary/40 divide-y divide-border overflow-hidden">
                    <ResultRow label="Cement" value={`${results.cementBags} bags`} />
                    <div className="px-4 py-3 space-y-1.5">
                      <p className="text-xs text-muted-foreground">Steel (by diameter)</p>
                      {results.steelByDiameter.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No steel calculated</p>
                      ) : (
                        results.steelByDiameter.map((row) => (
                          <div key={row.diameterMm} className="flex justify-between text-sm">
                            <span className="text-foreground/80">{row.diameterMm} mm</span>
                            <span className="font-semibold tabular-nums">{row.quintals} quintals</span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between text-sm pt-1 border-t border-border/60">
                        <span className="font-semibold text-foreground">Total Steel</span>
                        <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {results.totalSteelQuintals} quintals
                        </span>
                      </div>
                    </div>
                    <ResultRow label="Coarse Aggregate" value={`${results.aggregateCum} cum`} />
                    <ResultRow label="Sand" value={`${results.sandCum} cum`} />
                    <ResultRow
                      label="Bricks"
                      value={`approx ${results.bricks.toLocaleString('en-IN')} nos`}
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Includes {results.wastagePercent}% site wastage buffer
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Door/window openings are approximated via the 0.8 factor in wall area if
                    auto-estimated; if you entered wall area manually, deduct openings yourself
                    before entering for best accuracy.
                    {results.meta.wallAreaAutoEstimated && (
                      <> Auto wall area used: {results.meta.wallAreaSqft} sqft.</>
                    )}
                  </p>

                  <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-[11px] text-muted-foreground space-y-0.5">
                    <p>Concrete volume (raw): {results.concreteVolumeCum.total} cum</p>
                    <p>
                      Columns {results.concreteVolumeCum.columns} · Beams {results.concreteVolumeCum.beams} ·
                      Footings {results.concreteVolumeCum.footings} · Slab {results.concreteVolumeCum.slab}
                    </p>
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
                      onClick={() => downloadEstimatePdf(inputs, results)}
                    >
                      <Download className="w-4 h-4" /> Download as PDF
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

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground tabular-nums text-right">{value}</span>
    </div>
  );
}
