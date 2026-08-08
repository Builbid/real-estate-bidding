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
  getAssamBrickWallHeightFt,
  getAssamTimberPostHeightFt,
} from '@/lib/estimate-calculator/assamCalculate';
import { calculateAssamCostBreakdown, formatInr } from '@/lib/estimate-calculator/assamCosts';
import { downloadAssamEstimatePdf } from '@/lib/estimate-calculator/assamPdf';
import {
  ASSAM_BRICK_HEIGHT_FT,
  BUILT_UP_AREA_INFO,
  DEFAULT_ASSAM_INPUTS,
  UNIT_TYPE_DEFAULT_AREA,
  type AssamBrickWallUpTo,
  type AssamEstimateInputs,
  type FlooringFinish,
  type UnitType,
  type WastagePercent,
} from '@/lib/estimate-calculator/types';
import { cn } from '@/lib/utils';

type AssamStep = 1 | 2 | 3;

const PROGRESS_LABELS = ['Plan', 'Structure', 'Rates & Cost'] as const;

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
  }, [step, showResults]);

  function update<K extends keyof AssamEstimateInputs>(key: K, value: AssamEstimateInputs[K]) {
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

  const results = useMemo(() => calculateAssamEstimate(inputs), [inputs]);
  const costs = useMemo(
    () => calculateAssamCostBreakdown(inputs, results, inputs.rates),
    [inputs, results],
  );
  const brickH = getAssamBrickWallHeightFt(inputs);
  const timberH = getAssamTimberPostHeightFt(inputs);

  function goResults() {
    setShowResults(true);
    setStep(3);
  }

  return (
    <div ref={topRef} className="space-y-5 scroll-mt-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Assam Type · Semi-pucca
          </p>
          <h2 className="text-base font-semibold text-foreground mt-0.5">
            Brick + timber frame + CGI roof
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
              <h2 className="text-base font-semibold text-foreground">Plan & brick height</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumField
                  label="Number of floors"
                  value={inputs.floors}
                  min={1}
                  onChange={(n) => update('floors', Math.max(1, Math.floor(n)))}
                  hint="Assam Type is usually single storey; multi-storey multiplies walls."
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
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Brick wall up to
                  </label>
                  <Select
                    value={inputs.brickWallUpTo}
                    onValueChange={(v) => update('brickWallUpTo', v as AssamBrickWallUpTo)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sill">
                        Sill (~{ASSAM_BRICK_HEIGHT_FT.sill} ft) — timber + panels above
                      </SelectItem>
                      <SelectItem value="lintel">
                        Lintel (~{ASSAM_BRICK_HEIGHT_FT.lintel} ft) — more brick, less panel
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Semi-pucca: masonry to sill (common) or lintel; timber frame continues to eaves.
                  </p>
                </div>
                <NumField
                  label="Foundation depth (below GL)"
                  value={inputs.foundationDepthFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('foundationDepthFt', Math.max(0, n))}
                  hint="Typically ~2 ft (600 mm) for Assam Type plinth walls."
                />
                <NumField
                  label="Plinth height"
                  value={inputs.plinthHeightFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('plinthHeightFt', Math.max(0, n))}
                />
                <NumField
                  label="Eaves / wall height (floor to eaves)"
                  value={inputs.eavesHeightFt}
                  step={0.5}
                  suffix="ft"
                  onChange={(n) => update('eavesHeightFt', Math.max(brickH + 1, n))}
                  hint={`Brick ${brickH} ft + timber panel ${timberH.toFixed(1)} ft = ${inputs.eavesHeightFt} ft.`}
                />
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
                No full RCC frame or roof slab. Quantities use brick plinth/sill (or lintel), timber posts & bands,
                bamboo/mesh panels, and pitched CGI roofing.
              </div>

              <Button size="lg" className="w-full" onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-base font-semibold text-foreground">Timber & CGI defaults</h2>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Research defaults (WHE Assam-type): posts @ 1.1 m, rafters @ 650 mm, purlins @ 300 mm, CGI pitch 1.20.
                Override only if your carpenter/engineer specifies otherwise.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumField
                  label="Timber post spacing"
                  value={inputs.postSpacingM}
                  step={0.1}
                  min={0.5}
                  suffix="m"
                  onChange={(n) => update('postSpacingM', Math.max(0.5, n))}
                />
                <NumField
                  label="Post section (square)"
                  value={inputs.postWidthMm}
                  min={50}
                  suffix="mm"
                  onChange={(n) => {
                    const v = Math.max(50, Math.floor(n));
                    setInputs((prev) => ({ ...prev, postWidthMm: v, postDepthMm: v }));
                    setShowResults(false);
                  }}
                  hint="Applies to width × depth (square)."
                />
                <NumField
                  label="Band width"
                  value={inputs.bandWidthMm}
                  min={50}
                  suffix="mm"
                  onChange={(n) => update('bandWidthMm', Math.max(50, Math.floor(n)))}
                />
                <NumField
                  label="Band depth"
                  value={inputs.bandDepthMm}
                  min={40}
                  suffix="mm"
                  onChange={(n) => update('bandDepthMm', Math.max(40, Math.floor(n)))}
                />
                <NumField
                  label="Rafter spacing"
                  value={inputs.rafterSpacingMm}
                  min={300}
                  suffix="mm"
                  onChange={(n) => update('rafterSpacingMm', Math.max(300, Math.floor(n)))}
                />
                <NumField
                  label="Purlin spacing"
                  value={inputs.purlinSpacingMm}
                  min={200}
                  suffix="mm"
                  onChange={(n) => update('purlinSpacingMm', Math.max(200, Math.floor(n)))}
                />
                <NumField
                  label="CGI pitch factor"
                  value={inputs.cgiPitchFactor}
                  step={0.05}
                  min={1}
                  onChange={(n) => update('cgiPitchFactor', Math.max(1, n))}
                  hint="Sloping CGI area ÷ plan area (1.15–1.25 typical)."
                />
                <NumField
                  label="CGI sheet wastage"
                  value={inputs.cgiWastagePercent}
                  min={0}
                  suffix="%"
                  onChange={(n) => update('cgiWastagePercent', Math.max(0, n))}
                />
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p>
                  Preview: ~{results.meta.timberPostCount} timber posts · {results.meta.timberPostHeightFt} ft high ·{' '}
                  {results.meta.bandCount} band levels · CGI ~{results.cgiAreaSqft} sqft
                </p>
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
              <h2 className="text-base font-semibold text-foreground">Rates & cost</h2>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Assam / Tier-2 mid-points — edit to match local timber, CGI, and mistri rates.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumField
                  label="Mistri rate"
                  value={inputs.rates.mistriPerSqft}
                  suffix="₹/sqft"
                  onChange={(n) => updateRate('mistriPerSqft', Math.max(0, n))}
                  hint="Labour = total built-up (sqft) × this rate"
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
                  label="Brick price"
                  value={inputs.rates.brickPerPiece}
                  suffix="₹/pc"
                  onChange={(n) => updateRate('brickPerPiece', Math.max(0, n))}
                />
                <NumField
                  label="Aggregate (PCC)"
                  value={inputs.rates.aggregatePerCum}
                  suffix="₹/cum"
                  onChange={(n) => updateRate('aggregatePerCum', Math.max(0, n))}
                />
                <NumField
                  label="Timber (Sal/Nahar class)"
                  value={inputs.rates.timberPerCft}
                  suffix="₹/cft"
                  onChange={(n) => updateRate('timberPerCft', Math.max(0, n))}
                />
                <NumField
                  label="CGI roofing"
                  value={inputs.rates.cgiPerSqft}
                  suffix="₹/sqft"
                  onChange={(n) => updateRate('cgiPerSqft', Math.max(0, n))}
                />
                <NumField
                  label="Bamboo / mesh panel"
                  value={inputs.rates.wallPanelPerSqft}
                  suffix="₹/sqft"
                  onChange={(n) => updateRate('wallPanelPerSqft', Math.max(0, n))}
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

              {!showResults && (
                <Button size="lg" className="w-full" onClick={goResults}>
                  <Calculator className="w-4 h-4" /> Calculate Assam Type estimate
                </Button>
              )}

              {showResults && (
                <div className="space-y-4 border-t border-border pt-5">
                  <h2 className="text-base font-semibold text-foreground">Material estimate</h2>
                  <div className="rounded-xl border border-border bg-secondary/40 divide-y divide-border overflow-hidden">
                    <ResultRow label="Cement" value={`${results.cementBags} bags`} />
                    <div className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      Brick mortar {results.meta.cementBagsBrickMortar} + plaster{' '}
                      {results.meta.cementBagsPlaster} + PCC pedestals {results.meta.cementBagsPcc}{' '}
                      (before wastage)
                    </div>
                    <ResultRow label="Sand" value={`${results.sandCum} cum`} />
                    <ResultRow label="Aggregate (PCC)" value={`${results.aggregateCum} cum`} />
                    <ResultRow
                      label="Bricks (total)"
                      value={`approx ${results.bricks.toLocaleString('en-IN')} nos`}
                    />
                    <div className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      Foundation {results.meta.bricksFoundation.toLocaleString('en-IN')} · Walls{' '}
                      {results.meta.bricksWalls.toLocaleString('en-IN')} · Flooring{' '}
                      {results.meta.bricksFlooring.toLocaleString('en-IN')}
                    </div>
                    <ResultRow label="Timber (total)" value={`${results.timberCft} cft`} />
                    <div className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      Posts {results.meta.timberPostsCft} · Bands {results.meta.timberBandsCft} · Roof{' '}
                      {results.meta.timberRoofCft} cft · {results.meta.timberPostCount} posts
                    </div>
                    <ResultRow label="CGI roofing" value={`${results.cgiAreaSqft} sqft`} />
                    <ResultRow
                      label="Bamboo / mesh panels"
                      value={`${results.wallPanelAreaSqft} sqft`}
                    />
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
                    setStep(2);
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
