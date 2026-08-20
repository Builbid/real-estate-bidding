'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AssamDistrictAutocomplete,
  parseAssamDistrictSelection,
} from '@/components/shared/AssamDistrictAutocomplete';
import { TradeWorkRequirementsFields, type TradeWorkFormFields } from '@/components/owner/TradeWorkRequirementsFields';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { generateProjectTitle } from '@/lib/generateProjectTitle';
import { hasContactInfo } from '@/lib/validation/projectContactInfo';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import { getTradeLabel, getTradeEmoji } from '@/lib/trades';
import {
  PAINTER_FINISH_OPTIONS,
  PAINTER_PRIMER_OPTIONS,
  PAINTER_SCOPE_OPTIONS,
  PAINTER_START_TIME_OPTIONS,
  PAINTER_SURFACE_OPTIONS,
  PAINTER_TOPCOAT_OPTIONS,
  getPainterWorkRequirementBlocks,
  validatePainterDetailsInput,
  type PainterPaintFinish,
  type PainterPaintTopcoats,
  type PainterPaintingScope,
  type PainterPrimerRequirement,
  type PainterStartTimeType,
  type PainterSurfaceCondition,
} from '@/lib/painterDetails';
import {
  PLUMBING_BUILDING_STOREYS_OPTIONS,
  PLUMBING_HOUSE_STRUCTURE_OPTIONS,
  PLUMBING_TARGET_FLOOR_OPTIONS,
  emptyBathroomPackageSelections,
  houseStructureToTrackType,
  getTradeScopeLabel,
  getTradeWorkRequirementBlocks,
  isCustomTradeWorkService,
  validateTradeDetailsInput,
} from '@/lib/tradeWorkDetails';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';
import type { TrackType, TradeServiceType } from '@/lib/types';

type Step = 1 | 2 | 3;

const BIDDING_MINUTES = 7;

const PROGRESS_LABELS = ['Project Info', 'Work Requirements', 'Review & Launch'] as const;

const BUILDING_TYPE_OPTIONS: { value: TrackType; label: string; description: string }[] = [
  { value: 'RCC', label: 'RCC', description: 'Reinforced cement concrete building' },
  { value: 'AssamType', label: 'Assam Type', description: 'Traditional Assam-type building' },
];

interface FormState extends TradeWorkFormFields {
  location: string;
  villageTownName: string;
  pincode: string;
  bidding_minutes: string;
  track_type: TrackType | null;
  projectArea: string;
  paintingScope: PainterPaintingScope | null;
  paintFinish: PainterPaintFinish | null;
  surfaceCondition: PainterSurfaceCondition | null;
  primerRequirement: PainterPrimerRequirement | '';
  paintTopcoats: PainterPaintTopcoats | null;
}

const EMPTY_FORM: FormState = {
  location: '',
  villageTownName: '',
  pincode: '',
  bidding_minutes: String(BIDDING_MINUTES),
  track_type: null,
  projectArea: '',
  paintingScope: null,
  paintFinish: null,
  surfaceCondition: null,
  primerRequirement: '',
  paintTopcoats: null,
  plumberScope: 'full_house',
  bathrooms: 1,
  kitchens: 1,
  overheadTank: true,
  concealedPiping: true,
  bathroomPackage: null,
  bathroomSize: null,
  plumbingFloorLevel: 'ground',
  fittingType: 'concealed_wall_cutting',
  tankDistance: null,
  houseStructure: null,
  targetFloors: [],
  targetWorkFloor: null,
  buildingStoreys: null,
  approxBuiltUpAreaSqft: '',
  selectedPackages: [],
  selectedSubOptions: [],
  waterTankFloor: null,
  bathroomPackages: emptyBathroomPackageSelections(),
  pipingPackage: null,
  cpvcPipeSizes: ['three_quarter'],
  waterInstallMethods: ['open_outer_fitting'],
  includeToiletWastePipe: true,
  drainageInstallMethods: ['open_outer_hanging'],
  electricianScope: 'full_house_wiring',
  pointEstimate: null,
  heavyAppliances: [],
  concealedWiring: null,
  doorWindowFramesQuantity: '',
  kitchenSizeLayout: '',
  kitchenMaterialType: '',
  kitchenFittingsHardware: '',
  interiorScope: null,
  targetSpaces: [],
  interiorArea: '',
  earthworkType: null,
  machineRequirement: null,
  projectStartTimeType: null,
  projectStartTimeSpecificDate: '',
  additionalRequirements: '',
};

interface TradeServiceProjectWizardProps {
  trade: TradeServiceType;
}

export function TradeServiceProjectWizard({ trade }: TradeServiceProjectWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [step1Errors, setStep1Errors] = useState<{
    location?: string;
    villageTownName?: string;
    pincode?: string;
    houseStructure?: string;
    targetWorkFloor?: string;
    buildingStoreys?: string;
    approxBuiltUpAreaSqft?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const tradeLabel = getTradeLabel(trade);
  const tradeEmoji = getTradeEmoji(trade);
  const isPainter = trade === 'painter';
  const isEarthwork = trade === 'earthwork';
  const isCustomTrade = isCustomTradeWorkService(trade);

  const districtSelection = parseAssamDistrictSelection(form.location);
  const previewTradeDetails = isCustomTrade ? validatedTradeDetails() : null;
  const previewScope =
    previewTradeDetails && !('error' in previewTradeDetails)
      ? getTradeScopeLabel(previewTradeDetails.details)
      : null;
  const previewTitle = generateProjectTitle(
    isPainter
      ? {
          serviceType: trade,
          district: districtSelection?.district ?? form.location,
          paintingScope: form.paintingScope,
        }
      : {
          serviceType: trade,
          district: districtSelection?.district ?? form.location,
          trackType: form.track_type,
          scopeLabel: previewScope,
        },
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (step1ValidationAttempted && (
      key === 'location' ||
      key === 'villageTownName' ||
      key === 'pincode' ||
      key === 'houseStructure' ||
      key === 'targetWorkFloor' ||
      key === 'buildingStoreys' ||
      key === 'approxBuiltUpAreaSqft'
    )) {
      setStep1Errors((errors) => {
        const next = { ...errors };
        if (key === 'location') delete next.location;
        if (key === 'villageTownName') delete next.villageTownName;
        if (key === 'pincode') delete next.pincode;
        if (key === 'houseStructure') delete next.houseStructure;
        if (key === 'targetWorkFloor') delete next.targetWorkFloor;
        if (key === 'buildingStoreys') delete next.buildingStoreys;
        if (key === 'approxBuiltUpAreaSqft') delete next.approxBuiltUpAreaSqft;
        return next;
      });
    }
  }

  function tryGoStep2() {
    const errors: typeof step1Errors = {};

    if (!parseAssamDistrictSelection(form.location)) {
      errors.location = 'Please select a district from the list.';
    }

    if (isEarthwork) {
      const villageTownName = form.villageTownName.trim();
      if (!villageTownName) {
        errors.villageTownName = 'Enter the village or town name.';
      } else if (villageTownName.length < 2) {
        errors.villageTownName = 'Village / town name must be at least 2 characters.';
      } else if (hasContactInfo(villageTownName)) {
        errors.villageTownName = 'Village / town name cannot include contact details.';
      }
    }

    const pincodeError = validatePincode(form.pincode);
    if (pincodeError) {
      errors.pincode = pincodeError;
    }

    if (trade === 'plumber') {
      if (!form.houseStructure) {
        errors.houseStructure = 'Select RCC Building or Assam Type.';
      }
      if (!form.targetWorkFloor) {
        errors.targetWorkFloor = 'Select the target work floor.';
      }
      if (!form.buildingStoreys) {
        errors.buildingStoreys = 'Select the total floors in the building.';
      }
      const area = parseFloat(form.approxBuiltUpAreaSqft.replace(/,/g, '').trim());
      if (!Number.isFinite(area) || area <= 0) {
        errors.approxBuiltUpAreaSqft = 'Enter the approximate built-up area in Sq Ft.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setStep1ValidationAttempted(true);
      setStep1Errors(errors);
      return;
    }

    setStep1ValidationAttempted(false);
    setStep1Errors({});
    setStep(2);
  }

  function validatedTradeDetails() {
    if (!isCustomTrade) return null;
    return validateTradeDetailsInput({
      service: trade,
      projectStartTimeType: form.projectStartTimeType,
      projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
      additionalRequirements: form.additionalRequirements,
      plumberScope: form.plumberScope,
      bathrooms: form.bathrooms,
      kitchens: form.kitchens,
      overheadTank: form.overheadTank,
      concealedPiping: form.concealedPiping,
      bathroomPackage: form.bathroomPackage,
      bathroomSize: form.bathroomSize,
      plumbingFloorLevel: form.plumbingFloorLevel,
      tankDistance: form.tankDistance,
      fittingType: form.fittingType,
      houseStructure: form.houseStructure,
      targetFloors: form.targetWorkFloor ? [form.targetWorkFloor] : form.targetFloors,
      targetWorkFloor: form.targetWorkFloor,
      buildingStoreys: form.buildingStoreys,
      approxBuiltUpAreaSqft: form.approxBuiltUpAreaSqft,
      selectedPackages: form.selectedPackages,
      selectedSubOptions: form.selectedSubOptions,
      waterTankFloor: form.waterTankFloor,
      bathroomPackages: form.bathroomPackages,
      pipingPackage: form.pipingPackage,
      cpvcPipeSizes: form.cpvcPipeSizes,
      waterInstallMethods: form.waterInstallMethods,
      includeToiletWastePipe: form.includeToiletWastePipe,
      drainageInstallMethods: form.drainageInstallMethods,
      electricianScope: form.electricianScope,
      pointEstimate: form.pointEstimate,
      heavyAppliances: form.heavyAppliances,
      concealedWiring: form.concealedWiring,
      carpenterScopes: [],
      doorWindowFramesQuantity: form.doorWindowFramesQuantity,
      kitchenSizeLayout: form.kitchenSizeLayout,
      kitchenMaterialType: form.kitchenMaterialType,
      kitchenFittingsHardware: form.kitchenFittingsHardware,
      interiorScope: form.interiorScope,
      targetSpaces: form.targetSpaces,
      interiorArea: form.interiorArea,
      villageTownName: isEarthwork ? form.villageTownName : '',
      earthworkType: form.earthworkType,
      machineRequirement: form.machineRequirement,
    });
  }

  function tryGoStep3() {
    if (isPainter && !form.track_type) {
      setStep2Error('Please select a building type to continue.');
      return;
    }
    if (isPainter) {
      const validated = validatePainterDetailsInput({
        projectArea: form.projectArea,
        primerRequirement: form.primerRequirement,
        projectStartTimeType: form.projectStartTimeType as PainterStartTimeType | null,
        projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
        paintingScope: form.paintingScope,
        paintFinish: form.paintFinish,
        surfaceCondition: form.surfaceCondition,
        paintTopcoats: form.paintTopcoats,
        additionalRequirements: form.additionalRequirements,
      });
      if ('error' in validated) {
        setStep2Error(validated.error);
        return;
      }
    }
    if (isCustomTrade) {
      const validated = validatedTradeDetails();
      if (validated && 'error' in validated) {
        setStep2Error(validated.error);
        return;
      }
    }
    setStep2Error(null);
    setStep(3);
  }

  async function handleSubmit() {
    if (isPainter && !form.track_type) return;
    setLoading(true);
    setError(null);

    const districtSelection = parseAssamDistrictSelection(form.location);
    if (!districtSelection) {
      setError('Please select a district from the list.');
      setLoading(false);
      return;
    }

    if (hasContactInfo(form.additionalRequirements)) {
      setError('Remove contact details from additional requirements before submitting.');
      setLoading(false);
      return;
    }

    let painterDetails;
    if (isPainter) {
      const validated = validatePainterDetailsInput({
        projectArea: form.projectArea,
        primerRequirement: form.primerRequirement,
        projectStartTimeType: form.projectStartTimeType as PainterStartTimeType | null,
        projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
        paintingScope: form.paintingScope,
        paintFinish: form.paintFinish,
        surfaceCondition: form.surfaceCondition,
        paintTopcoats: form.paintTopcoats,
        additionalRequirements: form.additionalRequirements,
      });
      if ('error' in validated) {
        setError(validated.error);
        setLoading(false);
        return;
      }
      painterDetails = validated.details;
    }

    let tradeDetails;
    if (isCustomTrade) {
      const validated = validatedTradeDetails();
      if (!validated || 'error' in validated) {
        setError(validated && 'error' in validated ? validated.error : 'Work requirements are incomplete.');
        setLoading(false);
        return;
      }
      tradeDetails = validated.details;
    }

    const autoTitle = generateProjectTitle(
      isPainter
        ? {
            serviceType: trade,
            district: districtSelection.district,
            paintingScope: form.paintingScope,
          }
        : {
            serviceType: trade,
            district: districtSelection.district,
            trackType: form.track_type,
            scopeLabel: tradeDetails ? getTradeScopeLabel(tradeDetails) : null,
          },
    );

    const result = await createProjectAction({
      title: autoTitle,
      description: isEarthwork ? form.villageTownName.trim() : undefined,
      track_type: form.track_type ?? 'RCC',
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      bidding_minutes: parseInt(form.bidding_minutes, 10),
      service_type: trade,
      ...(painterDetails ? { painter_details: painterDetails } : {}),
      ...(tradeDetails ? { trade_details: tradeDetails } : {}),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/dashboard/owner');
  }

  const reviewTradeDetails = isCustomTrade ? validatedTradeDetails() : null;
  const reviewTradeBlocks =
    reviewTradeDetails && !('error' in reviewTradeDetails)
      ? getTradeWorkRequirementBlocks(reviewTradeDetails.details).filter(
          (block) =>
            block.label !== 'Village / Town Name' &&
            block.label !== 'Estimated Depth' &&
            block.label !== 'Area / Volume',
        )
      : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>{tradeEmoji}</span> Post {tradeLabel} Project
        </h1>
        <p className="text-sm text-gray-700 dark:text-zinc-300 mt-1">
          Registered {tradeLabel.toLowerCase()}s will bid their rate{' '}
          {trade === 'plumber'
            ? 'as per-unit labour rates for the fittings and piping items you select'
            : trade === 'electrician'
              ? 'per point'
              : 'per sqft'}{' '}
          on your project.
        </p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PROGRESS_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0',
                i + 1 < step ? 'bg-emerald-500 text-white' :
                i + 1 === step ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' :
                'bg-secondary text-muted-foreground/80',
              )}
            >
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span
              className={cn(
                'text-[10px] sm:text-xs truncate',
                i + 1 === step ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-600 dark:text-zinc-400',
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
        <CardContent className="pt-6 pb-6">
          {error && (
            <div className="flex items-start gap-3 mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Project Information</h2>

              <AssamDistrictAutocomplete
                value={form.location}
                onChange={(v) => update('location', v)}
                error={step1ValidationAttempted ? step1Errors.location : undefined}
              />

              {isEarthwork && (
                <Input
                  label="Village / Town Name"
                  type="text"
                  placeholder="e.g. Rampur, Nalbari"
                  value={form.villageTownName}
                  onChange={(e) => update('villageTownName', e.target.value)}
                  error={step1ValidationAttempted ? step1Errors.villageTownName : undefined}
                />
              )}

              <Input
                label="Pincode"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 781001"
                value={form.pincode}
                onChange={(e) => update('pincode', formatPincodeInput(e.target.value))}
                error={step1ValidationAttempted ? step1Errors.pincode : undefined}
              />

              {trade === 'plumber' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
                      Building Structure Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PLUMBING_HOUSE_STRUCTURE_OPTIONS.map((opt) => {
                        const selected = form.houseStructure === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setForm((current) => ({
                                ...current,
                                houseStructure: opt.value,
                                track_type: houseStructureToTrackType(opt.value),
                                targetWorkFloor: opt.value === 'assam_type' ? current.targetWorkFloor ?? 'ground' : current.targetWorkFloor,
                                targetFloors: opt.value === 'assam_type' ? ['ground'] : current.targetWorkFloor ? [current.targetWorkFloor] : [],
                                buildingStoreys: opt.value === 'assam_type' ? current.buildingStoreys ?? 'single' : current.buildingStoreys,
                                plumbingFloorLevel: opt.value === 'assam_type' ? 'ground' : current.plumbingFloorLevel,
                                waterTankFloor: opt.value === 'assam_type' ? null : current.waterTankFloor,
                              }));
                              setStep1Errors((errors) => {
                                const next = { ...errors };
                                delete next.houseStructure;
                                return next;
                              });
                            }}
                            className={cn(
                              'relative text-left rounded-xl border-2 p-4 pr-10 transition-all duration-200',
                              selected
                                ? 'border-emerald-500/70 bg-emerald-500/8 shadow-md shadow-emerald-500/15'
                                : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
                            )}
                          >
                            {selected && (
                              <CheckCircle2 className="absolute top-2.5 right-2.5 w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                            )}
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{opt.label}</span>
                            <p className="text-xs font-medium text-gray-700 dark:text-zinc-300 mt-1">{opt.description}</p>
                          </button>
                        );
                      })}
                    </div>
                    {step1ValidationAttempted && step1Errors.houseStructure ? (
                      <p className="text-xs font-medium text-red-400">{step1Errors.houseStructure}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
                      Target Work Floor
                    </label>
                    <OptionSelectGrid
                      options={PLUMBING_TARGET_FLOOR_OPTIONS}
                      value={form.targetWorkFloor}
                      onSelect={(floor) => {
                        update('targetWorkFloor', floor);
                        update('targetFloors', [floor]);
                      }}
                      columns={2}
                    />
                    {step1ValidationAttempted && step1Errors.targetWorkFloor ? (
                      <p className="text-xs font-medium text-red-400">{step1Errors.targetWorkFloor}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
                      Total Floors in Building
                    </label>
                    <OptionSelectGrid
                      options={PLUMBING_BUILDING_STOREYS_OPTIONS}
                      value={form.buildingStoreys}
                      onSelect={(value) => update('buildingStoreys', value)}
                      columns={2}
                    />
                    {step1ValidationAttempted && step1Errors.buildingStoreys ? (
                      <p className="text-xs font-medium text-red-400">{step1Errors.buildingStoreys}</p>
                    ) : null}
                  </div>

                  <Input
                    label="Approx Built-Up Area"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    placeholder="e.g. 1200"
                    suffix={<span className="text-xs font-medium text-muted-foreground">Sq Ft</span>}
                    value={form.approxBuiltUpAreaSqft}
                    onChange={(e) => update('approxBuiltUpAreaSqft', e.target.value)}
                    error={step1ValidationAttempted ? step1Errors.approxBuiltUpAreaSqft : undefined}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
                  Bidding Duration
                </label>
                <Select value={form.bidding_minutes} onValueChange={(v) => update('bidding_minutes', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Minutes (Quick)</SelectItem>
                    <SelectItem value="1440">24 Hours (Standard)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                  After bidding closes you have 5 minutes to select a {tradeLabel.toLowerCase()}.
                </p>
              </div>

              <Button size="lg" className="w-full" onClick={tryGoStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isPainter ? 'Building Type & Work Requirements' : 'Work Requirements'}
              </h2>
              <p className="text-xs font-medium text-gray-700 dark:text-zinc-300 -mt-3">
                {isPainter
                  ? 'Tell painters the building type, area, primer, materials, and when work should start.'
                  : trade === 'plumber'
                    ? 'Check the plumbing categories you need, then pick the sub-options plumbers should quote as labour unit rates.'
                    : `Describe the ${tradeLabel.toLowerCase()} work so bidders can quote without scope conflicts.`}
              </p>

              {step2Error && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              {isPainter && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BUILDING_TYPE_OPTIONS.map((opt) => {
                    const selected = form.track_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          update('track_type', opt.value);
                          setStep2Error(null);
                        }}
                        className={cn(
                          'relative text-left rounded-xl border-2 p-4 pr-10 transition-all duration-200',
                          selected
                            ? 'border-emerald-500/70 bg-emerald-500/8 shadow-md shadow-emerald-500/15 scale-[1.02]'
                            : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
                        )}
                      >
                        {selected && (
                          <CheckCircle2 className="absolute top-2.5 right-2.5 w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{opt.label}</span>
                        <p className="text-xs font-medium text-gray-700 dark:text-zinc-300 mt-1">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {isPainter && (
                <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/20 p-4">
                  <Input
                    label="Approximate Paint Area"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="1"
                    placeholder="e.g. Approx. 1500 Sq. Ft."
                    value={form.projectArea}
                    onChange={(e) => {
                      update('projectArea', e.target.value);
                      setStep2Error(null);
                    }}
                  />

                  <PainterChoice
                    label="Painting Scope"
                    options={PAINTER_SCOPE_OPTIONS}
                    value={form.paintingScope}
                    onChange={(v) => {
                      update('paintingScope', v);
                      setStep2Error(null);
                    }}
                    columns={3}
                  />

                  <PainterChoice
                    label="Paint Finish / Quality"
                    options={PAINTER_FINISH_OPTIONS}
                    value={form.paintFinish}
                    onChange={(v) => {
                      update('paintFinish', v);
                      setStep2Error(null);
                    }}
                  />

                  <PainterChoice
                    label="Surface Condition"
                    options={PAINTER_SURFACE_OPTIONS}
                    value={form.surfaceCondition}
                    onChange={(v) => {
                      update('surfaceCondition', v);
                      setStep2Error(null);
                    }}
                  />

                  <PainterChoice
                    label="Primer Requirement"
                    options={PAINTER_PRIMER_OPTIONS}
                    value={form.primerRequirement || null}
                    onChange={(v) => {
                      update('primerRequirement', v);
                      setStep2Error(null);
                    }}
                    columns={3}
                  />

                  <PainterChoice
                    label="Paint Topcoats"
                    options={PAINTER_TOPCOAT_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    value={form.paintTopcoats}
                    onChange={(v) => {
                      update('paintTopcoats', v);
                      setStep2Error(null);
                    }}
                    columns={3}
                  />

                  <PainterChoice
                    label="Project Starting Time"
                    options={PAINTER_START_TIME_OPTIONS}
                    value={form.projectStartTimeType}
                    onChange={(v) => {
                      update('projectStartTimeType', v);
                      if (v !== 'specific') update('projectStartTimeSpecificDate', '');
                      setStep2Error(null);
                    }}
                    columns={2}
                  />
                  {form.projectStartTimeType === 'specific' && (
                    <Input
                      label="Specific Start Date"
                      type="date"
                      value={form.projectStartTimeSpecificDate}
                      onChange={(e) => {
                        update('projectStartTimeSpecificDate', e.target.value);
                        setStep2Error(null);
                      }}
                    />
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
                      Additional Requirements <span className="normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Specify any custom instructions, special paint brands, scaffolding needs, or details not covered above..."
                      value={form.additionalRequirements}
                      onChange={(e) => {
                        update('additionalRequirements', e.target.value);
                        setStep2Error(null);
                      }}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                    />
                  </div>
                </div>
              )}

              {isCustomTrade && (
                <TradeWorkRequirementsFields
                  trade={trade}
                  form={form}
                  onChange={(key, value) => {
                    setForm((current) => ({ ...current, [key]: value }));
                    setStep2Error(null);
                  }}
                />
              )}

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" onClick={tryGoStep3}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (isCustomTrade || form.track_type) && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Review & Launch Auction</h2>

              <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
                {[
                  { label: 'Service', value: `${tradeEmoji} ${tradeLabel}` },
                  { label: 'Project Title', value: previewTitle },
                  { label: 'District', value: form.location },
                  ...(isEarthwork
                    ? [{ label: 'Village / Town Name', value: form.villageTownName.trim() }]
                    : []),
                  { label: 'Pincode', value: form.pincode.trim() || 'Not specified' },
                  ...(isPainter
                    ? [
                        {
                          label: 'Building Type',
                          value: BUILDING_TYPE_OPTIONS.find((o) => o.value === form.track_type)?.label ?? '—',
                        },
                      ]
                    : []),
                  ...(isPainter && form.projectArea && form.paintingScope && form.paintFinish && form.surfaceCondition && form.primerRequirement && form.paintTopcoats && form.projectStartTimeType
                    ? getPainterWorkRequirementBlocks({
                        projectArea: parseFloat(form.projectArea) || 0,
                        primerRequirement: form.primerRequirement,
                        materialsIncludeClient: null,
                        projectStartTimeType: form.projectStartTimeType as PainterStartTimeType,
                        projectStartTimeSpecificDate: form.projectStartTimeSpecificDate || null,
                        paintingScope: form.paintingScope,
                        paintFinish: form.paintFinish,
                        surfaceCondition: form.surfaceCondition,
                        paintTopcoats: form.paintTopcoats,
                        additionalRequirements: form.additionalRequirements.trim() || null,
                      })
                    : []),
                  ...reviewTradeBlocks,
                  {
                    label: 'Bidding Window',
                    value:
                      form.bidding_minutes === '7'
                        ? '7 minutes from launch'
                        : '24 hours from launch',
                  },
                  { label: 'Selection Window', value: '5 minutes after bids close' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-zinc-400 flex-1 min-w-0">{label}</span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white text-right flex-shrink-0 max-w-[55%]">
                    <div className="min-w-0 whitespace-pre-line text-right">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" disabled={loading} onClick={handleSubmit}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Launching…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">🚀 Launch Auction</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PainterChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 1,
}: {
  label: string;
  options: { value: T; label: string }[] | readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const normalized = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  );
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
        {label}
      </label>
      <div
        className={cn(
          'grid gap-2',
          columns === 3 && 'grid-cols-1 sm:grid-cols-3',
          columns === 2 && 'grid-cols-1 sm:grid-cols-2',
          columns === 1 && 'grid-cols-1',
        )}
      >
        {normalized.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'relative rounded-lg border px-3 py-2.5 pr-8 text-left text-xs font-semibold transition-colors',
                selected
                  ? 'border-emerald-500/70 bg-emerald-500/10 text-gray-900 dark:text-white'
                  : 'border-border bg-card text-gray-800 dark:text-zinc-100 hover:border-muted-foreground/40',
              )}
            >
              {selected && (
                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
