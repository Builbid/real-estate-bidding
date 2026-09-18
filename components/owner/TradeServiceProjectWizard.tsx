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
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import { TradeWorkRequirementsFields, type TradeWorkFormFields } from '@/components/owner/TradeWorkRequirementsFields';
import { FORM_CONTINUE_BTN, FORM_OPTION_SELECTED, FORM_OPTION_UNSELECTED, FORM_SECTION_CARD, FORM_SHELL_CARD, FORM_TEXTAREA } from '@/components/owner/wizard/formTheme';
import { WIZARD_SECTION_LABEL, withSectionColon } from '@/components/owner/wizard/StartTimeAndNotes';
import { ReviewSummaryList, WizardStepper } from '@/components/owner/wizard/ReviewSummary';
import { generateProjectTitle } from '@/lib/generateProjectTitle';
import { hasContactInfo } from '@/lib/validation/projectContactInfo';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import { todayLocalDateString } from '@/lib/projectStartTime';
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
import type { BuildingType } from '@/lib/buildingConfig';
import { parseCustomFloorSequence } from '@/lib/mistriDetails';
import {
  PLUMBING_HOUSE_STRUCTURE_OPTIONS,
  buildingTypesFromTargetFloors,
  emptyBathroomPackageSelections,
  houseStructureToTrackType,
  getTradeWorkRequirementBlocks,
  isCustomTradeWorkService,
  targetFloorsFromBuildingSelection,
  validateTradeDetailsInput,
} from '@/lib/tradeWorkDetails';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';
import type { TrackType, TradeServiceType } from '@/lib/types';

type Step = 1 | 2 | 3;

const BIDDING_MINUTES = 7;

const DEFAULT_PROGRESS_LABELS = ['Project Info', 'Work Requirements', 'Review & Launch'] as const;
const FIXTURE_PROGRESS_LABELS = ['Project Info', 'Fixture Quantities', 'Review & Launch'] as const;

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

function applyTargetFloorSelection(
  current: FormState,
  types: BuildingType[],
  customSelected: boolean,
  customNumber: string,
): FormState {
  const nextFloors = targetFloorsFromBuildingSelection(types, customSelected);
  const keepFloor = (key: string) => nextFloors.includes(key as (typeof nextFloors)[number]);
  return {
    ...current,
    targetFloors: nextFloors,
    targetWorkFloor: nextFloors[0] ?? null,
    customTargetFloors: customSelected ? customNumber : '',
    floorFixtureCounts: Object.fromEntries(
      Object.entries(current.floorFixtureCounts).filter(([key]) => keepFloor(key)),
    ) as FormState['floorFixtureCounts'],
    electricianFloorFixtureCounts: Object.fromEntries(
      Object.entries(current.electricianFloorFixtureCounts).filter(([key]) => keepFloor(key)),
    ) as FormState['electricianFloorFixtureCounts'],
  };
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
  customTargetFloors: '',
  buildingStoreys: null,
  approxBuiltUpAreaSqft: '',
  selectedPackages: [],
  selectedSubOptions: [],
  floorFixtureCounts: {},
  plumbingFittingType: null,
  estimatedLongConnectionLengthFt: '',
  waterTankFloor: null,
  customWaterTankFloor: '',
  bathroomPackages: emptyBathroomPackageSelections(),
  pipingPackage: null,
  cpvcPipeSizes: ['three_quarter'],
  waterInstallMethods: ['open_outer_fitting'],
  includeToiletWastePipe: true,
  drainageInstallMethods: ['open_outer_hanging'],
  electricianPackages: [],
  electricianSubOptions: [],
  electricianFloorFixtureCounts: {},
  electricianWiringType: null,
  interiorPackages: [],
  interiorSubOptions: [],
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
    customTargetFloors?: string;
    approxBuiltUpAreaSqft?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const tradeLabel = getTradeLabel(trade);
  const tradeEmoji = getTradeEmoji(trade);
  const isPainter = trade === 'painter';
  const isEarthwork = trade === 'earthwork';
  const isCustomTrade = isCustomTradeWorkService(trade);

  const districtSelection = parseAssamDistrictSelection(form.location);
  const previewTitle = generateProjectTitle({
    serviceType: trade,
    district: districtSelection?.district ?? form.location,
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (step1ValidationAttempted && (
      key === 'location' ||
      key === 'villageTownName' ||
      key === 'pincode' ||
      key === 'houseStructure' ||
      key === 'targetFloors' ||
      key === 'targetWorkFloor' ||
      key === 'customTargetFloors' ||
      key === 'approxBuiltUpAreaSqft'
    )) {
      setStep1Errors((errors) => {
        const next = { ...errors };
        if (key === 'location') delete next.location;
        if (key === 'villageTownName') delete next.villageTownName;
        if (key === 'pincode') delete next.pincode;
        if (key === 'houseStructure') delete next.houseStructure;
        if (key === 'targetFloors' || key === 'targetWorkFloor') delete next.targetWorkFloor;
        if (key === 'customTargetFloors') delete next.customTargetFloors;
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

    if (trade === 'plumber' || trade === 'electrician' || trade === 'false_ceiling_work') {
      if (!form.houseStructure) {
        errors.houseStructure = 'Select RCC Building or Assam Type.';
      }
      if (form.targetFloors.length === 0) {
        errors.targetWorkFloor = 'Select at least one target work floor.';
      }
      if (
        form.targetFloors.includes('custom') &&
        !parseCustomFloorSequence(form.customTargetFloors, { allowGaps: true })
      ) {
        errors.customTargetFloors = 'Enter floor numbers above 4th (e.g., 5, 6, 7).';
      }
      if (trade === 'false_ceiling_work') {
        const area = parseFloat(form.approxBuiltUpAreaSqft.replace(/,/g, '').trim());
        if (!Number.isFinite(area) || area <= 0) {
          errors.approxBuiltUpAreaSqft = 'Enter the approximate built-up area in Sq Ft.';
        }
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
      targetFloors: form.targetFloors,
      targetWorkFloor: form.targetFloors[0] ?? form.targetWorkFloor,
      customTargetFloors: form.customTargetFloors,
      buildingStoreys: form.buildingStoreys,
      approxBuiltUpAreaSqft: form.approxBuiltUpAreaSqft,
      selectedPackages: form.selectedPackages,
      selectedSubOptions: form.selectedSubOptions,
      floorFixtureCounts: form.floorFixtureCounts,
      plumbingFittingType: form.plumbingFittingType,
      estimatedLongConnectionLengthFt: form.estimatedLongConnectionLengthFt,
      waterTankFloor: form.waterTankFloor,
      customWaterTankFloor: form.customWaterTankFloor,
      bathroomPackages: form.bathroomPackages,
      pipingPackage: form.pipingPackage,
      cpvcPipeSizes: form.cpvcPipeSizes,
      waterInstallMethods: form.waterInstallMethods,
      includeToiletWastePipe: form.includeToiletWastePipe,
      drainageInstallMethods: form.drainageInstallMethods,
      electricianPackages: form.electricianPackages,
      electricianSubOptions: form.electricianSubOptions,
      electricianFloorFixtureCounts: form.electricianFloorFixtureCounts,
      electricianWiringType: form.electricianWiringType,
      interiorPackages: form.interiorPackages,
      interiorSubOptions: form.interiorSubOptions,
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

    const autoTitle = generateProjectTitle({
      serviceType: trade,
      district: districtSelection.district,
    });

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
            block.label !== 'Area / Volume' &&
            block.label !== 'Point Weights' &&
            !(
              (trade === 'plumber' || trade === 'electrician') &&
              block.label === 'Approx Built-Up Area'
            ),
        )
      : [];

  const progressLabels =
    trade === 'plumber' || trade === 'electrician' ? FIXTURE_PROGRESS_LABELS : DEFAULT_PROGRESS_LABELS;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <HistoryBackButton className="mb-2" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>{tradeEmoji}</span> Post {tradeLabel} Project
        </h1>
        <p className="text-sm text-gray-700 dark:text-zinc-300 mt-1">
          Registered {tradeLabel.toLowerCase()}s will bid their rate{' '}
          {trade === 'plumber'
            ? 'as plumber rates per fixture for basin, taps, shower, commode, and geyser on each selected floor'
            : trade === 'electrician'
              ? 'as electrician rates per point for ceiling lights, fans, ACs, refrigerators, and inverters on each selected floor'
              : 'per sqft'}{' '}
          on your project.
        </p>
      </div>

      <WizardStepper labels={progressLabels} step={step} />

      <Card className={FORM_SHELL_CARD}>
        <CardContent className="pt-6 pb-6">
          {error && (
            <div className="flex items-start gap-3 mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
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

              {(trade === 'plumber' || trade === 'electrician' || trade === 'false_ceiling_work') && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={WIZARD_SECTION_LABEL}>
                      {withSectionColon('Building Structure Type')} <span className="text-red-500">*</span>
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
                                plumbingFloorLevel: opt.value === 'assam_type' ? 'ground' : current.plumbingFloorLevel,
                                waterTankFloor: opt.value === 'assam_type' ? null : current.waterTankFloor,
                                customWaterTankFloor: opt.value === 'assam_type' ? '' : current.customWaterTankFloor,
                              }));
                              setStep1Errors((errors) => {
                                const next = { ...errors };
                                delete next.houseStructure;
                                return next;
                              });
                            }}
                            className={cn(
                              'relative text-left rounded-xl p-4 pr-10 transition-all duration-200',
                              selected ? FORM_OPTION_SELECTED : FORM_OPTION_UNSELECTED,
                            )}
                          >
                            {selected && (
                              <CheckCircle2 className="absolute top-2.5 right-2.5 w-5 h-5 text-blue-600 flex-shrink-0" />
                            )}
                            <span className={cn('text-sm', selected ? 'font-medium text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200')}>{opt.label}</span>
                            <p className="text-xs font-medium text-slate-500 mt-1">{opt.description}</p>
                          </button>
                        );
                      })}
                    </div>
                    {step1ValidationAttempted && step1Errors.houseStructure ? (
                      <p className="text-xs font-medium text-red-400">{step1Errors.houseStructure}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={WIZARD_SECTION_LABEL}>
                      {withSectionColon('Target Work Floor')}
                    </label>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                      Select only the RCC floors included in this project. Intermediate floors are not added automatically.
                    </p>
                    <BuildingTypeSelector
                      purpose="mistri"
                      rccOnly
                      allowNonSequentialFloors
                      value={buildingTypesFromTargetFloors(form.targetFloors)}
                      onChange={(types) => {
                        setForm((current) =>
                          applyTargetFloorSelection(
                            current,
                            types,
                            current.targetFloors.includes('custom'),
                            current.customTargetFloors,
                          ),
                        );
                        if (step1ValidationAttempted) {
                          setStep1Errors((errors) => {
                            const nextErrors = { ...errors };
                            delete nextErrors.targetWorkFloor;
                            delete nextErrors.customTargetFloors;
                            return nextErrors;
                          });
                        }
                      }}
                      showCustomFloor
                      customSelected={form.targetFloors.includes('custom')}
                      customFloorNumber={form.customTargetFloors}
                      onCustomChange={(selected, number) => {
                        setForm((current) =>
                          applyTargetFloorSelection(
                            current,
                            buildingTypesFromTargetFloors(current.targetFloors),
                            selected,
                            number,
                          ),
                        );
                        if (step1ValidationAttempted) {
                          setStep1Errors((errors) => {
                            const nextErrors = { ...errors };
                            delete nextErrors.targetWorkFloor;
                            delete nextErrors.customTargetFloors;
                            return nextErrors;
                          });
                        }
                      }}
                      error={step1ValidationAttempted ? step1Errors.targetWorkFloor ?? null : null}
                      customError={step1ValidationAttempted ? step1Errors.customTargetFloors ?? null : null}
                    />
                  </div>

                  {trade === 'false_ceiling_work' ? (
                    <Input
                      label="Approx Built-Up Area (Sq Ft)"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      placeholder="e.g. 1200"
                      required
                      suffix={<span className="text-xs font-medium text-muted-foreground">Sq Ft</span>}
                      value={form.approxBuiltUpAreaSqft}
                      onChange={(e) => update('approxBuiltUpAreaSqft', e.target.value)}
                      error={step1ValidationAttempted ? step1Errors.approxBuiltUpAreaSqft : undefined}
                    />
                  ) : null}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={WIZARD_SECTION_LABEL}>
                  {withSectionColon('Bidding Duration')}
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
                <p className="text-[11px] font-medium text-brand">
                  After bidding closes you have 5 minutes to select a {tradeLabel.toLowerCase()}.
                </p>
              </div>

              <Button size="lg" className={cn('w-full', FORM_CONTINUE_BTN)} onClick={tryGoStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isPainter
                  ? 'Building Type & Work Requirements'
                  : trade === 'plumber' || trade === 'electrician'
                    ? 'Fixture Quantities'
                    : 'Work Requirements'}
              </h2>
              <p className="text-xs font-medium text-gray-700 dark:text-zinc-300 -mt-3">
                {isPainter
                  ? 'Tell painters the building type, area, primer, materials, and when work should start.'
                  : trade === 'plumber'
                    ? 'Enter how many basins, taps, showers, commodes, and geysers you need on each selected floor.'
                    : trade === 'electrician'
                      ? 'Enter how many ceiling lights, ceiling fans, ACs, refrigerators, and inverters you need on each selected floor.'
                      : trade === 'false_ceiling_work'
                        ? 'Check the interior design categories you need, then pick the sub-options designers should quote as interior designer unit rates.'
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
                          'relative text-left rounded-xl p-4 pr-10 transition-all duration-200',
                          selected ? FORM_OPTION_SELECTED : FORM_OPTION_UNSELECTED,
                        )}
                      >
                        {selected && (
                          <CheckCircle2 className="absolute top-2.5 right-2.5 w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                        <span className={cn('text-sm', selected ? 'font-medium text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200')}>{opt.label}</span>
                        <p className="text-xs font-medium text-slate-500 mt-1">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {isPainter && (
                <div className="space-y-4">
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

                  <div className={FORM_SECTION_CARD}>
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
                        min={todayLocalDateString()}
                        value={form.projectStartTimeSpecificDate}
                        onChange={(e) => {
                          update('projectStartTimeSpecificDate', e.target.value);
                          setStep2Error(null);
                        }}
                      />
                    )}
                  </div>

                  <div className={FORM_SECTION_CARD}>
                    <label className={WIZARD_SECTION_LABEL}>
                      Additional Requirements <span className="normal-case tracking-normal">(optional)</span>:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Specify any custom instructions, special paint brands, scaffolding needs, or details not covered above..."
                      value={form.additionalRequirements}
                      onChange={(e) => {
                        update('additionalRequirements', e.target.value);
                        setStep2Error(null);
                      }}
                      className={FORM_TEXTAREA}
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
                <Button size="lg" className={cn('flex-1', FORM_CONTINUE_BTN)} onClick={tryGoStep3}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (isCustomTrade || form.track_type) && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Review & Launch Auction</h2>

              <ReviewSummaryList
                items={[
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
                ]}
              />

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" className={cn('flex-1', FORM_CONTINUE_BTN)} disabled={loading} onClick={handleSubmit}>
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
    <div className="space-y-4">
      <label className={WIZARD_SECTION_LABEL}>{withSectionColon(label)}</label>
      <div
        className={cn(
          'grid gap-3',
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
                'relative rounded-xl px-3 py-2.5 pr-8 text-left text-xs transition-all',
                selected ? FORM_OPTION_SELECTED : FORM_OPTION_UNSELECTED,
              )}
            >
              {selected && (
                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-blue-600" />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
