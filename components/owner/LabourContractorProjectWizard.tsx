'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { BuildingTypeSelector } from '@/components/construction/BuildingTypeSelector';
import {
  AssamDistrictAutocomplete,
  parseAssamDistrictSelection,
} from '@/components/shared/AssamDistrictAutocomplete';
import { generateProjectTitle } from '@/lib/generateProjectTitle';
import { hasContactInfo } from '@/lib/validation/projectContactInfo';
import { formatPincodeInput, validatePincode } from '@/lib/validation/pincode';
import { todayLocalDateString } from '@/lib/projectStartTime';
import type { BuildingType } from '@/lib/buildingConfig';
import { ASSAM_BUILDING_TYPE } from '@/lib/buildingConfig';
import {
  getCustomFloorSequenceInvalidMessage,
  FOUNDATION_CAPACITY_INVALID_MESSAGE,
  FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE,
  FOUNDATION_PROVISION_NOTE,
  MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS,
  MISTRI_ASSAM_ROOF_OPTIONS,
  MISTRI_ASSAM_ROOFING_SHEET_OPTIONS,
  MISTRI_APPROXIMATE_AREA_LABEL,
  MISTRI_BOUNDARY_WALL_MATERIAL_OPTIONS,
  MISTRI_BOUNDARY_WALL_PLASTER_OPTIONS,
  MISTRI_BOUNDARY_WALL_TIMELINE_OPTIONS,
  MISTRI_BRICKWORK_MATERIAL_OPTIONS,
  MISTRI_CONTRACT_TYPE_OPTIONS,
  MISTRI_CUSTOM_FLOOR_ID,
  MISTRI_FLOORING_MATERIAL_OPTIONS,
  MISTRI_RCC_SCOPE_OPTIONS,
  MISTRI_START_TIME_OPTIONS,
  MISTRI_WALL_PLASTER_WORK_OPTIONS,
  MISTRI_YES_NO_OPTIONS,
  applyRccScopeToggle,
  currentFloorPlanFromFloorWork,
  floorPlanUpperCount,
  formatMistriFloorWorkLabel,
  formatMistriRccScopeDescription,
  getMistriFullFinishedIncludes,
  getMistriRccScopeLabel,
  getMistriWorkRequirementBlocks,
  isAssamMistriFloor,
  isFinishingScopeBlockedByLowerStructure,
  isFlooringWorkLocked,
  isRccScopeDisabled,
  finishingScopeLockedByLowerStructureMessage,
  mistriContractTypeRequiredForFloorWork,
  mistriFoundationProvisionRequired,
  parseCustomFloorSequence,
  parseFoundationCustomFloorCount,
  parseApproximateAreaSqft,
  flooringAreaExceedsPlinthError,
  formatEstimatedWallAreaSqft,
  WALL_AREA_ESTIMATE_NOTE,
  parseFoundationDepthFt,
  computeBoundaryWallAreaSqft,
  computeBoundaryWallPlasteringAreaSqft,
  rccScopeFromWorkTypes,
  rccScopesFromWorkTypes,
  sortMistriFloorWork,
  validateMistriBoundaryWallInput,
  validateMistriFloorWorkInput,
  wallPlasterWorkModeFromWorkTypes,
  workTypesFromRccScopes,
  workTypesFromWallPlasterMode,
  type MistriAssamRoofType,
  type MistriAssamRoofingSheet,
  type MistriBoundaryWallMaterial,
  type MistriBoundaryWallTimeline,
  type MistriBrickworkMaterial,
  type MistriContractType,
  type MistriFloorId,
  type MistriFloorWork,
  type MistriFloorWorkType,
  type MistriFlooringMaterial,
  type MistriPlasterScope,
  type MistriRccScopeOption,
  type MistriStartTimeType,
  type MistriWallPlasteringScope,
  type MistriWallPlasterWorkMode,
} from '@/lib/mistriDetails';
import { HistoryBackButton } from '@/components/shared/HistoryBackButton';
import {
  FORM_BADGE,
  FORM_CONTINUE_BTN,
  FORM_HEADING,
  FORM_MARKER_IDLE,
  FORM_MARKER_ON,
  FORM_NESTED_PANEL,
  FORM_NOTE,
  FORM_NOTE_BOX,
  FORM_OPTION_SELECTED,
  FORM_OPTION_UNSELECTED,
  FORM_SECTION_CARD,
  FORM_SHELL_CARD,
  FORM_TEXTAREA,
} from '@/components/owner/wizard/formTheme';
import { ADDITIONAL_REQUIREMENTS_PLACEHOLDER, ProjectStartDatePicker, WIZARD_SECTION_LABEL, WizardAccentLabels, withSectionColon } from '@/components/owner/wizard/StartTimeAndNotes';
import { ReviewSummaryList, WizardStepper } from '@/components/owner/wizard/ReviewSummary';
import { WizardContinueGuidance } from '@/components/owner/wizard/WizardContinueGuidance';
import { FieldError, messageMatches, useScrollToFirstInvalid } from '@/components/owner/wizard/fieldValidation';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';

type Step = 1 | 2 | 3 | 4;

const BIDDING_MINUTES = 7;

const SECTION_LABEL = WIZARD_SECTION_LABEL;
const HELPER_TEXT =
  'text-[11px] font-medium text-slate-500 leading-relaxed';

interface FloorWorkForm {
  workTypes: MistriFloorWorkType[];
  brickMaterial: MistriBrickworkMaterial | null;
  plasterScope: MistriPlasterScope | null;
  flooringMaterial: MistriFlooringMaterial | null;
  includeFineFlooring: boolean | null;
  flooringAreaSqft: string;
  wallAreaSqft: string;
  assamRoofType: MistriAssamRoofType | null;
  assamRoofingSheet: MistriAssamRoofingSheet | null;
  foundationDepthFt: string;
}

const EMPTY_FLOOR_WORK: FloorWorkForm = {
  workTypes: [],
  brickMaterial: null,
  plasterScope: null,
  flooringMaterial: null,
  includeFineFlooring: null,
  flooringAreaSqft: '',
  wallAreaSqft: '',
  assamRoofType: null,
  assamRoofingSheet: null,
  foundationDepthFt: '',
};

const ASSAM_FULL_FINISHED_WORK: FloorWorkForm = {
  ...EMPTY_FLOOR_WORK,
  workTypes: ['full_finished'],
};

function FlooringAreaField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <Input
        label="Approximate Flooring Work Area (sq. ft.)"
        type="text"
        inputMode="decimal"
        placeholder=""
        value={value}
        error={error ?? undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function WallAreaField({
  value,
  onChange,
  plinthArea,
}: {
  value: string;
  onChange: (value: string) => void;
  plinthArea: string;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (value.trim()) return;
    const estimated = formatEstimatedWallAreaSqft(plinthArea);
    if (estimated) onChangeRef.current(estimated);
  }, [plinthArea, value]);

  return (
    <div className="space-y-1.5">
      <Input
        label="Approximate Wall Area (sq. ft.)"
        type="text"
        inputMode="decimal"
        placeholder=""
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className={FORM_NOTE}>{WALL_AREA_ESTIMATE_NOTE}</p>
    </div>
  );
}

function OptionCardButton({
  selected,
  onClick,
  children,
  className,
  disabled,
  locked,
  note,
  marker = 'radio',
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  locked?: boolean;
  note?: string;
  marker?: 'radio' | 'checkbox';
}) {
  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (!disabled) onClick();
        }}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition-all',
          selected ? FORM_OPTION_SELECTED : FORM_OPTION_UNSELECTED,
          disabled && 'cursor-not-allowed opacity-50 grayscale hover:border-slate-700/30 hover:bg-slate-800/40',
          className,
        )}
      >
        <span className="min-w-0">{children}</span>
        {locked ? (
          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : marker === 'checkbox' ? (
          selected ? (
            <span
              aria-hidden
              className={cn(
                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px]',
                FORM_MARKER_ON,
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          ) : (
            <span
              aria-hidden
              className={cn('h-5 w-5 flex-shrink-0 rounded-[4px]', FORM_MARKER_IDLE)}
            />
          )
        ) : selected ? (
          <span
            aria-hidden
            className={cn(
              'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
              'border border-blue-500/50',
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          </span>
        ) : (
          <span
            aria-hidden
            className={cn('h-5 w-5 flex-shrink-0 rounded-full', FORM_MARKER_IDLE)}
          />
        )}
      </button>
      {note ? <p className={FORM_NOTE}>{note}</p> : null}
    </div>
  );
}

function ChoiceRadio({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <span
        aria-hidden
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-blue-500/50"
      >
        <span className="h-2 w-2 rounded-full bg-blue-500" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn('h-4 w-4 flex-shrink-0 rounded-full', FORM_MARKER_IDLE)}
    />
  );
}

function NestedChoiceButtons<T extends string>({
  question,
  options,
  value,
  onChange,
  columns = 1,
  invalid = false,
}: {
  question: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3 | 4;
  invalid?: boolean;
}) {
  const inlineRow = columns !== 1;

  return (
    <div
      className={cn('space-y-4 rounded-xl', invalid && 'ring-1 ring-red-500')}
      data-field-invalid={invalid ? 'true' : undefined}
    >
      <p className={SECTION_LABEL}>{withSectionColon(question)}</p>
      <div
        className={cn(
          'grid gap-3',
          columns === 4 && 'grid-cols-2 sm:grid-cols-4 sm:items-stretch',
          columns === 3 && 'grid-cols-1 sm:grid-cols-3',
          columns === 2 && 'grid-cols-2',
          columns === 1 && 'grid-cols-1',
        )}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          if (inlineRow) {
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'flex min-h-[2.75rem] w-full min-w-0 items-start gap-2 overflow-visible rounded-xl px-3 py-2.5 text-left text-xs leading-snug transition-all sm:items-center',
                  selected ? FORM_OPTION_SELECTED : FORM_OPTION_UNSELECTED,
                )}
              >
                <ChoiceRadio selected={selected} />
                <span className="min-w-0 leading-snug break-words">{opt.label}</span>
              </button>
            );
          }
          return (
            <OptionCardButton
              key={opt.value}
              selected={selected}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </OptionCardButton>
          );
        })}
      </div>
    </div>
  );
}

const PROGRESS_LABELS = [
  'Project Info',
  'Work Requirements',
  'Review & Launch',
] as const;

type MistriHouseType = 'assam' | 'rcc' | 'boundary_wall';

const MISTRI_HOUSE_TYPE_OPTIONS: {
  value: MistriHouseType;
  label: string;
}[] = [
  { value: 'assam', label: 'Assam Type' },
  { value: 'rcc', label: 'RCC Structure' },
  { value: 'boundary_wall', label: 'Boundary Wall' },
];

const HOUSE_TYPE_ICON_CLASS = 'h-12 w-12';

function AssamTypeGraphic() {
  return (
    <svg viewBox="0 0 128 96" className={HOUSE_TYPE_ICON_CLASS} aria-hidden>
      <ellipse cx="64" cy="88" rx="50" ry="8" fill="#86efac" opacity="0.55" />
      <rect x="26" y="46" width="76" height="38" rx="3" fill="#fde68a" />
      <rect x="26" y="46" width="76" height="10" fill="#fcd34d" />
      <polygon points="18,50 64,12 110,50" fill="#ea580c" />
      <polygon points="28,50 64,20 100,50" fill="#f97316" />
      <rect x="61" y="12" width="6" height="10" rx="1" fill="#9a3412" />
      <rect x="32" y="62" width="5" height="22" rx="1" fill="#92400e" />
      <rect x="91" y="62" width="5" height="22" rx="1" fill="#92400e" />
      <rect x="55" y="60" width="18" height="24" rx="2" fill="#b45309" />
      <rect x="34" y="54" width="14" height="12" rx="1.5" fill="#38bdf8" />
      <rect x="80" y="54" width="14" height="12" rx="1.5" fill="#38bdf8" />
      <rect x="36" y="56" width="10" height="8" fill="#7dd3fc" />
      <rect x="82" y="56" width="10" height="8" fill="#7dd3fc" />
    </svg>
  );
}

function RccStructureGraphic() {
  return (
    <svg viewBox="0 0 128 96" className={HOUSE_TYPE_ICON_CLASS} aria-hidden>
      <ellipse cx="64" cy="88" rx="48" ry="8" fill="#93c5fd" opacity="0.5" />
      <rect x="28" y="14" width="72" height="70" rx="4" fill="#64748b" />
      <rect x="28" y="14" width="72" height="8" rx="4" fill="#475569" />
      <rect x="34" y="10" width="12" height="6" rx="1" fill="#94a3b8" />
      <rect x="36" y="26" width="14" height="12" rx="1.5" fill="#38bdf8" />
      <rect x="56" y="26" width="14" height="12" rx="1.5" fill="#7dd3fc" />
      <rect x="76" y="26" width="14" height="12" rx="1.5" fill="#38bdf8" />
      <rect x="36" y="44" width="14" height="12" rx="1.5" fill="#7dd3fc" />
      <rect x="56" y="44" width="14" height="12" rx="1.5" fill="#38bdf8" />
      <rect x="76" y="44" width="14" height="12" rx="1.5" fill="#7dd3fc" />
      <rect x="36" y="62" width="14" height="12" rx="1.5" fill="#38bdf8" />
      <rect x="76" y="62" width="14" height="12" rx="1.5" fill="#38bdf8" />
      <rect x="54" y="68" width="20" height="16" rx="1.5" fill="#1e293b" />
    </svg>
  );
}

function BoundaryWallGraphic() {
  const mortar = '#f3e0cf';
  const bricks = [
    { x: 16, y: 20, w: 30, fill: '#c2410c' },
    { x: 48, y: 20, w: 32, fill: '#b91c1c' },
    { x: 82, y: 20, w: 30, fill: '#c2410c' },
    { x: 16, y: 36, w: 16, fill: '#9a3412' },
    { x: 34, y: 36, w: 32, fill: '#ea580c' },
    { x: 68, y: 36, w: 30, fill: '#b45309' },
    { x: 100, y: 36, w: 12, fill: '#c2410c' },
    { x: 16, y: 52, w: 30, fill: '#b91c1c' },
    { x: 48, y: 52, w: 32, fill: '#c2410c' },
    { x: 82, y: 52, w: 30, fill: '#9a3412' },
    { x: 16, y: 68, w: 16, fill: '#b45309' },
    { x: 34, y: 68, w: 32, fill: '#c2410c' },
    { x: 68, y: 68, w: 30, fill: '#ea580c' },
    { x: 100, y: 68, w: 12, fill: '#b91c1c' },
  ];

  return (
    <svg viewBox="0 0 128 96" className={HOUSE_TYPE_ICON_CLASS} aria-hidden>
      <rect x="14" y="16" width="100" height="70" rx="3" fill={mortar} />
      <rect x="12" y="14" width="104" height="7" rx="1.5" fill="#9a3412" />
      {bricks.map((brick, i) => (
        <rect
          key={i}
          x={brick.x}
          y={brick.y}
          width={brick.w}
          height={12}
          rx="1.2"
          fill={brick.fill}
        />
      ))}
    </svg>
  );
}

function HouseTypeCard({
  selected,
  onClick,
  label,
  type,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  type: MistriHouseType;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[10.75rem] w-full cursor-pointer flex-col items-center justify-center space-y-3 rounded-xl p-6 text-center transition-all [overflow-anchor:none]',
        selected
          ? 'border-2 border-blue-600 bg-blue-50/80 font-medium text-slate-900 ring-2 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-950/40 dark:text-white'
          : 'border-2 border-slate-200/80 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:border-slate-600/50 dark:hover:bg-slate-800/60',
      )}
    >
      {type === 'assam' ? (
        <AssamTypeGraphic />
      ) : type === 'boundary_wall' ? (
        <BoundaryWallGraphic />
      ) : (
        <RccStructureGraphic />
      )}
      <span className={cn(selected ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200')}>
        {label}
      </span>
    </button>
  );
}

interface BoundaryWallForm {
  lengthFt: string;
  heightFt: string;
  materialType: MistriBoundaryWallMaterial | null;
  plasteringFinish: MistriWallPlasteringScope | null;
  plasteringAreaSqft: string;
  executionTimeline: MistriBoundaryWallTimeline | null;
  executionTimelineCustomDate: string;
}

const EMPTY_BOUNDARY_WALL: BoundaryWallForm = {
  lengthFt: '',
  heightFt: '',
  materialType: null,
  plasteringFinish: null,
  plasteringAreaSqft: '',
  executionTimeline: null,
  executionTimelineCustomDate: '',
};

interface FormState {
  location: string;
  pincode: string;
  bidding_minutes: string;
  houseType: MistriHouseType | null;
  buildingTypes: BuildingType[];
  customFloorSelected: boolean;
  customFloors: number[];
  floorWorkById: Record<string, FloorWorkForm>;
  approximateArea: string;
  /** Whole-number floor count for foundation provision (Ground Floor major only). */
  futureFloorCustom: string;
  contractType: MistriContractType | null;
  projectStartTimeType: MistriStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
  includeDoorWindowFrames: boolean;
  boundaryWall: BoundaryWallForm;
}

const EMPTY_FORM: FormState = {
  location: '',
  pincode: '',
  bidding_minutes: String(BIDDING_MINUTES),
  houseType: null,
  buildingTypes: [],
  customFloorSelected: false,
  customFloors: [],
  floorWorkById: {},
  approximateArea: '',
  futureFloorCustom: '',
  contractType: null,
  projectStartTimeType: null,
  projectStartTimeSpecificDate: '',
  additionalRequirements: '',
  includeDoorWindowFrames: false,
  boundaryWall: { ...EMPTY_BOUNDARY_WALL },
};

function selectedFloorEntries(form: FormState): Array<{
  floorId: MistriFloorId;
  customFloorNumber: number | null;
}> {
  const entries: Array<{ floorId: MistriFloorId; customFloorNumber: number | null }> =
    form.buildingTypes.map((floorId) => ({ floorId, customFloorNumber: null }));

  if (form.customFloorSelected) {
    const sequence = parseCustomFloorSequence(form.customFloors, {
      allowGaps: true,
    });
    if (sequence) {
      for (const n of sequence) {
        entries.push({ floorId: MISTRI_CUSTOM_FLOOR_ID, customFloorNumber: n });
      }
    }
  }
  return entries;
}

function floorWorkKey(
  floorId: MistriFloorId,
  customFloorNumber?: number | null,
): string {
  if (floorId === MISTRI_CUSTOM_FLOOR_ID) return `custom:${customFloorNumber ?? ''}`;
  return floorId;
}

function withoutFinishingScopes(current: FloorWorkForm): FloorWorkForm {
  const scopes = rccScopesFromWorkTypes(
    current.workTypes,
    current.includeFineFlooring,
  ).filter((scope) => scope !== 'wall_plaster_only');
  const nextScopes = scopes.includes('full_construction')
    ? scopes
    : scopes.filter((scope) => scope !== 'flooring_only');
  const wallMode = wallPlasterWorkModeFromWorkTypes(current.workTypes) ?? 'both';
  const keepFlooring = nextScopes.includes('flooring_only');
  return {
    ...current,
    workTypes: workTypesFromRccScopes(nextScopes, wallMode),
    brickMaterial: null,
    plasterScope: null,
    flooringMaterial: keepFlooring ? current.flooringMaterial : null,
    includeFineFlooring: keepFlooring ? current.includeFineFlooring : null,
    flooringAreaSqft: keepFlooring ? current.flooringAreaSqft : '',
    wallAreaSqft: '',
  };
}

function rccScopeFloorsFromForm(form: FormState): Array<{
  floorId: MistriFloorId;
  customFloorNumber: number | null;
  workTypes: MistriFloorWorkType[];
  scopeOption: ReturnType<typeof rccScopeFromWorkTypes>;
}> {
  return selectedFloorEntries(form).map((entry) => {
    const work = form.floorWorkById[floorWorkKey(entry.floorId, entry.customFloorNumber)]
      ?? EMPTY_FLOOR_WORK;
    const workTypes = isAssamMistriFloor(entry.floorId)
      ? (['full_finished'] as MistriFloorWorkType[])
      : work.workTypes;
    return {
      floorId: entry.floorId,
      customFloorNumber: entry.customFloorNumber,
      workTypes,
      scopeOption: rccScopeFromWorkTypes(workTypes),
    };
  });
}

function pruneFloorWorkById(
  floorWorkById: Record<string, FloorWorkForm>,
  entries: Array<{ floorId: MistriFloorId; customFloorNumber: number | null }>,
): Record<string, FloorWorkForm> {
  const keep = new Set(entries.map((e) => floorWorkKey(e.floorId, e.customFloorNumber)));
  const next: Record<string, FloorWorkForm> = {};
  for (const [key, value] of Object.entries(floorWorkById)) {
    if (keep.has(key)) next[key] = value;
  }
  return next;
}

export function LabourContractorProjectWizard() {
  const router = useRouter();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [invalidScrollToken, setInvalidScrollToken] = useState(0);
  useScrollToFirstInvalid(invalidScrollToken);
  function revealInvalid() {
    setInvalidScrollToken((token) => token + 1);
  }
  const [step1Errors, setStep1Errors] = useState<{
    location?: string;
    pincode?: string;
    builtUpArea?: string;
    houseType?: string;
    floors?: string;
    customFloor?: string;
    bidding?: string;
  }>({});
  const [step2FieldErrors, setStep2FieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submittedTitle, setSubmittedTitle] = useState('');
  const houseTypeScrollYRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const y = houseTypeScrollYRef.current;
    if (y == null) return;
    window.scrollTo(0, y);
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, y);
      houseTypeScrollYRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [form.houseType]);

  const districtSelection = parseAssamDistrictSelection(form.location);
  const parsedCustomSequence = parseCustomFloorSequence(form.customFloors, {
    allowGaps: true,
  });

  const assembledFloorWork: MistriFloorWork[] = useMemo(() => {
    const entries = selectedFloorEntries(form);
    return sortMistriFloorWork(
      entries.map((entry) => {
        const key = floorWorkKey(entry.floorId, entry.customFloorNumber);
        const work = form.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
        const isAssam = isAssamMistriFloor(entry.floorId);
        const workTypes = isAssam ? (['full_finished'] as MistriFloorWorkType[]) : work.workTypes;
        const scopeOption = isAssam ? null : rccScopeFromWorkTypes(workTypes);
        return {
          floorId: entry.floorId,
          customFloorNumber: entry.customFloorNumber,
          workTypes,
          brickMaterial: work.brickMaterial,
          plasterScope: work.plasterScope,
          flooringMaterial: work.flooringMaterial,
          includeFineFlooring: work.includeFineFlooring,
          flooringAreaSqft: parseApproximateAreaSqft(work.flooringAreaSqft),
          wallAreaSqft: parseApproximateAreaSqft(work.wallAreaSqft),
          scopeOption,
          scopeLabel:
            scopeOption
              ? formatMistriRccScopeDescription(
                  entry.floorId,
                  scopeOption,
                  work.includeFineFlooring === true,
                  work.brickMaterial,
                  work.flooringMaterial,
                  wallPlasterWorkModeFromWorkTypes(workTypes),
                  parseApproximateAreaSqft(work.wallAreaSqft),
                )
              : null,
          assamRoofType: isAssam ? work.assamRoofType : null,
          assamRoofingSheet: isAssam ? work.assamRoofingSheet : null,
          foundationDepthFt: isAssam ? parseFoundationDepthFt(work.foundationDepthFt) : null,
        };
      }),
    );
  }, [
    form.buildingTypes,
    form.customFloorSelected,
    form.customFloors,
    form.floorWorkById,
  ]);

  // Assam Type always uses full finishing upto plastering and roof work on Work Requirements.
  useEffect(() => {
    if (step !== 2) return;
    if (!form.buildingTypes.includes(ASSAM_BUILDING_TYPE)) return;
    const key = floorWorkKey(ASSAM_BUILDING_TYPE, null);
    setForm((f) => {
      const current = f.floorWorkById[key];
      if (
        current?.workTypes.length === 1 &&
        current.workTypes[0] === 'full_finished'
      ) {
        return f;
      }
      return {
        ...f,
        floorWorkById: {
          ...f.floorWorkById,
          [key]: {
            ...(current ?? EMPTY_FLOOR_WORK),
            workTypes: ['full_finished'],
            brickMaterial: null,
            plasterScope: null,
          },
        },
      };
    });
  }, [step, form.buildingTypes]);

  const previewTitle = generateProjectTitle({
    serviceType: 'labour_contractor',
    district: districtSelection?.district ?? form.location,
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (step1ValidationAttempted && (key === 'location' || key === 'pincode')) {
      setStep1Errors((errors) => {
        const next = { ...errors };
        if (key === 'location') delete next.location;
        if (key === 'pincode') delete next.pincode;
        return next;
      });
    }
  }

  function patchBoundaryWall(patch: Partial<BoundaryWallForm>) {
    setForm((f) => ({ ...f, boundaryWall: { ...f.boundaryWall, ...patch } }));
    setStep2Error(null);
  }

  function setHouseType(next: MistriHouseType) {
    if (form.houseType === next) return;
    houseTypeScrollYRef.current = window.scrollY;
    setForm((f) => {
      if (f.houseType === next) return f;
      if (next === 'assam') {
        return {
          ...f,
          houseType: 'assam',
          buildingTypes: [ASSAM_BUILDING_TYPE],
          customFloorSelected: false,
          customFloors: [],
          floorWorkById: {
            [ASSAM_BUILDING_TYPE]: { ...ASSAM_FULL_FINISHED_WORK },
          },
          futureFloorCustom: '',
          contractType: 'labor_only',
          boundaryWall: { ...EMPTY_BOUNDARY_WALL },
        };
      }
      if (next === 'boundary_wall') {
        return {
          ...f,
          houseType: 'boundary_wall',
          buildingTypes: [],
          customFloorSelected: false,
          customFloors: [],
          floorWorkById: {},
          futureFloorCustom: '',
          contractType: 'labor_only',
          projectStartTimeType: null,
          projectStartTimeSpecificDate: '',
          boundaryWall: { ...EMPTY_BOUNDARY_WALL },
        };
      }
      return {
        ...f,
        houseType: 'rcc',
        buildingTypes: [],
        customFloorSelected: false,
        customFloors: [],
        floorWorkById: {},
        futureFloorCustom: '',
        contractType: null,
        boundaryWall: { ...EMPTY_BOUNDARY_WALL },
      };
    });
    setStep1Errors((errors) => {
      const nextErrors = { ...errors };
      delete nextErrors.houseType;
      delete nextErrors.floors;
      delete nextErrors.customFloor;
      return nextErrors;
    });
  }

  function setBuildingTypes(nextTypes: BuildingType[]) {
    setForm((f) => {
      // House type Assam is fixed; RCC mode never includes Assam.
      const cleaned =
        f.houseType === 'rcc'
          ? nextTypes.filter((t) => t !== ASSAM_BUILDING_TYPE)
          : f.houseType === 'assam'
            ? [ASSAM_BUILDING_TYPE]
            : nextTypes;
      const draft: FormState = {
        ...f,
        buildingTypes: cleaned,
      };
      const entries = selectedFloorEntries(draft);
      let floorWorkById = pruneFloorWorkById(f.floorWorkById, entries);
      if (f.houseType === 'assam') {
        const key = floorWorkKey(ASSAM_BUILDING_TYPE, null);
        floorWorkById = {
          ...floorWorkById,
          [key]: {
            ...(floorWorkById[key] ?? ASSAM_FULL_FINISHED_WORK),
            workTypes: ['full_finished'],
          },
        };
      }
      const droppedGround =
        f.buildingTypes.includes('RCC Ground Floor') &&
        !cleaned.includes('RCC Ground Floor');
      return {
        ...draft,
        floorWorkById,
        ...(droppedGround ? { futureFloorCustom: '' } : {}),
      };
    });
    setStep1Errors((errors) => {
      const next = { ...errors };
      delete next.floors;
      delete next.customFloor;
      return next;
    });
  }

  function setCustomFloor(selected: boolean, floors: number[]) {
    setForm((f) => {
      if (f.houseType === 'assam') return f;
      const draft: FormState = {
        ...f,
        customFloorSelected: selected,
        customFloors: floors,
      };
      return {
        ...draft,
        floorWorkById: pruneFloorWorkById(f.floorWorkById, selectedFloorEntries(draft)),
      };
    });
    setStep1Errors((errors) => {
      const next = { ...errors };
      delete next.floors;
      delete next.customFloor;
      return next;
    });
  }

  function patchFloorWork(
    floorId: MistriFloorId,
    patch: Partial<FloorWorkForm>,
    customFloorNumber?: number | null,
  ) {
    setForm((f) => {
      const key = floorWorkKey(floorId, customFloorNumber);
      const current = f.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
      return {
        ...f,
        floorWorkById: {
          ...f.floorWorkById,
          [key]: { ...current, ...patch },
        },
      };
    });
    setStep2Error(null);
  }

  function toggleRccScope(
    floorId: MistriFloorId,
    option: MistriRccScopeOption,
    customFloorNumber?: number | null,
  ) {
    setForm((f) => {
      const key = floorWorkKey(floorId, customFloorNumber);
      const current = f.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
      const currentScopes = rccScopesFromWorkTypes(
        current.workTypes,
        current.includeFineFlooring,
      );
      if (isRccScopeDisabled(currentScopes, option)) {
        return f;
      }
      const currentScopeFloors = rccScopeFloorsFromForm(f);
      if (
        option === 'wall_plaster_only' &&
        !currentScopes.includes(option) &&
        isFinishingScopeBlockedByLowerStructure(
          floorId,
          currentScopeFloors,
          customFloorNumber,
        )
      ) {
        return f;
      }
      if (
        option === 'flooring_only' &&
        !currentScopes.includes(option) &&
        isFlooringWorkLocked(
          currentScopes,
          floorId,
          currentScopeFloors,
          customFloorNumber,
        )
      ) {
        return f;
      }
      const nextScopes = applyRccScopeToggle(currentScopes, option);
      const wallMode =
        wallPlasterWorkModeFromWorkTypes(current.workTypes) ?? 'both';
      const workTypes = workTypesFromRccScopes(nextScopes, wallMode);
      const keepWallFields = nextScopes.includes('wall_plaster_only');
      const keepFlooringFields = nextScopes.includes('flooring_only');
      const nextById: Record<string, FloorWorkForm> = {
        ...f.floorWorkById,
        [key]: {
          ...current,
          workTypes,
          brickMaterial:
            keepWallFields && wallMode !== 'plastering' ? current.brickMaterial : null,
          plasterScope:
            keepWallFields && wallMode !== 'wall'
              ? (current.plasterScope ?? 'both')
              : null,
          flooringMaterial: keepFlooringFields ? current.flooringMaterial : null,
          includeFineFlooring: keepFlooringFields ? true : null,
          flooringAreaSqft: keepFlooringFields ? current.flooringAreaSqft : '',
          wallAreaSqft: keepWallFields
            ? (current.wallAreaSqft.trim()
                ? current.wallAreaSqft
                : formatEstimatedWallAreaSqft(f.approximateArea))
            : '',
        },
      };
      const nextScopeFloors = rccScopeFloorsFromForm({ ...f, floorWorkById: nextById });
      for (const entry of selectedFloorEntries(f)) {
        if (isAssamMistriFloor(entry.floorId)) continue;
        if (
          !isFinishingScopeBlockedByLowerStructure(
            entry.floorId,
            nextScopeFloors,
            entry.customFloorNumber,
          )
        ) {
          continue;
        }
        const entryKey = floorWorkKey(entry.floorId, entry.customFloorNumber);
        nextById[entryKey] = withoutFinishingScopes(
          nextById[entryKey] ?? EMPTY_FLOOR_WORK,
        );
      }
      return {
        ...f,
        floorWorkById: nextById,
      };
    });
    setStep2Error(null);
  }

  function setWallPlasterWorkMode(
    floorId: MistriFloorId,
    mode: MistriWallPlasterWorkMode,
    customFloorNumber?: number | null,
  ) {
    setForm((f) => {
      const key = floorWorkKey(floorId, customFloorNumber);
      const current = f.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
      const nextTypes = workTypesFromWallPlasterMode(mode);
      if (
        current.workTypes.includes('flooring') ||
        current.includeFineFlooring === true
      ) {
        nextTypes.push('flooring');
      }
      return {
        ...f,
        floorWorkById: {
          ...f.floorWorkById,
          [key]: {
            ...current,
            workTypes: nextTypes,
            brickMaterial: mode === 'plastering' ? null : current.brickMaterial,
            plasterScope: mode === 'wall' ? null : (current.plasterScope ?? 'both'),
          },
        },
      };
    });
    setStep2Error(null);
  }

  function mistriValidationInput() {
    return {
      floorWork: assembledFloorWork,
      approximateArea: form.approximateArea,
      futureFloorOption: 'custom' as const,
      futureFloorCustom: form.futureFloorCustom,
      contractType: form.houseType === 'assam' ? 'labor_only' : form.contractType,
      projectStartTimeType: form.projectStartTimeType,
      projectStartTimeSpecificDate: form.projectStartTimeSpecificDate,
      additionalRequirements: form.additionalRequirements,
      includeDoorWindowFrames: false,
    };
  }

  function tryGoStep2() {
    const errors: typeof step1Errors = {};

    if (!parseAssamDistrictSelection(form.location)) {
      errors.location = 'Please select a district from the list.';
    }

    const pincodeError = validatePincode(form.pincode, { required: true });
    if (pincodeError) {
      errors.pincode = pincodeError;
    }
    if (form.bidding_minutes !== '7' && form.bidding_minutes !== '1440') {
      errors.bidding = 'Select a bidding duration.';
    }

    if (form.houseType !== 'boundary_wall' && parseApproximateAreaSqft(form.approximateArea) == null) {
      errors.builtUpArea = 'Enter the approximate plinth area in sq. ft.';
    }

    if (!form.houseType) {
      errors.houseType = 'Select Assam Type, RCC Structure, or Boundary Wall.';
    }

    if (form.houseType === 'rcc') {
      if (form.buildingTypes.length === 0 && !form.customFloorSelected) {
        errors.floors = 'Select at least one RCC floor.';
      }
    } else if (form.houseType === 'assam') {
      if (!form.buildingTypes.includes(ASSAM_BUILDING_TYPE)) {
        errors.floors = 'Assam Type house must stay selected.';
      }
    }

    if (form.houseType === 'rcc' && form.customFloorSelected) {
      if (!parsedCustomSequence || parsedCustomSequence.length === 0) {
        errors.customFloor = getCustomFloorSequenceInvalidMessage(false, true);
      }
    }

    if (Object.keys(errors).length > 0) {
      setStep1ValidationAttempted(true);
      setStep1Errors(errors);
      revealInvalid();
      return;
    }

    setStep1ValidationAttempted(false);
    setStep1Errors({});
    setStep(2);
  }

  function boundaryWallValidationInput() {
    const wall = form.boundaryWall;
    return {
      lengthFt: wall?.lengthFt ?? '',
      heightFt: wall?.heightFt ?? '',
      materialType: wall?.materialType ?? null,
      plasteringFinish: wall?.plasteringFinish ?? null,
      plasteringAreaSqft: wall?.plasteringAreaSqft ?? '',
      executionTimeline: wall?.executionTimeline ?? null,
      executionTimelineCustomDate: wall?.executionTimelineCustomDate ?? '',
      additionalRequirements: form.additionalRequirements,
    };
  }

  function flooringPlinthCapError(): string | null {
    for (const entry of selectedFloorEntries(form)) {
      const key = floorWorkKey(entry.floorId, entry.customFloorNumber);
      const work = form.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
      if (work.includeFineFlooring !== true && !work.workTypes.includes('flooring')) continue;
      const error = flooringAreaExceedsPlinthError(work.flooringAreaSqft, form.approximateArea);
      if (error) return error;
    }
    return null;
  }

  function collectBoundaryErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    const wall = form.boundaryWall;
    if (!wall?.lengthFt?.trim()) errors.length = 'Enter the boundary wall length in feet.';
    if (!wall?.heightFt?.trim()) errors.height = 'Enter the boundary wall height in feet.';
    if (!wall?.materialType) errors.material = 'Select a wall material: Red Clay Brick or AAC Block.';
    if (!wall?.plasteringFinish) errors.plaster = 'Select a plastering option for the boundary wall.';
    if (showManualPlasteringArea && !wall?.plasteringAreaSqft?.trim()) {
      errors.plasterArea = 'Enter the approximate plastering area (sq. ft.).';
    }
    if (!wall?.executionTimeline) errors.timeline = 'Select the work execution timeline.';
    if (wall?.executionTimeline === 'custom' && !wall.executionTimelineCustomDate?.trim()) {
      errors.customDate = 'Select a custom completion date.';
    }
    return errors;
  }

  function tryGoStep3() {
    if (form.houseType === 'boundary_wall') {
      const fieldErrors = collectBoundaryErrors();
      if (Object.keys(fieldErrors).length > 0) {
        setStep2FieldErrors(fieldErrors);
        setStep2Error(Object.values(fieldErrors)[0]);
        revealInvalid();
        return;
      }
      const validated = validateMistriBoundaryWallInput(boundaryWallValidationInput());
      if ('error' in validated) {
        setStep2FieldErrors({});
        setStep2Error(validated.error);
        revealInvalid();
        return;
      }
      setStep2FieldErrors({});
      setStep2Error(null);
      setStep(3);
      return;
    }
    const flooringCap = flooringPlinthCapError();
    if (flooringCap) {
      setStep2Error(flooringCap);
      revealInvalid();
      return;
    }
    const validated = validateMistriFloorWorkInput(mistriValidationInput());
    if ('error' in validated) {
      setStep2Error(validated.error);
      revealInvalid();
      return;
    }
    setStep2Error(null);
    setStep(3);
  }

  async function handleSubmit() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const districtSelection = parseAssamDistrictSelection(form.location);
    if (!districtSelection) {
      setError('Please select a district from the list.');
      setLoading(false);
      revealInvalid();
      return;
    }

    if (hasContactInfo(form.additionalRequirements)) {
      setError('Remove contact details from additional requirements before submitting.');
      setLoading(false);
      revealInvalid();
      return;
    }

    if (form.houseType !== 'boundary_wall') {
      const flooringCap = flooringPlinthCapError();
      if (flooringCap) {
        setError(flooringCap);
        setLoading(false);
        revealInvalid();
        return;
      }
    }

    const validated =
      form.houseType === 'boundary_wall'
        ? validateMistriBoundaryWallInput(boundaryWallValidationInput())
        : validateMistriFloorWorkInput(mistriValidationInput());
    if ('error' in validated) {
      setError(validated.error);
      setLoading(false);
      revealInvalid();
      return;
    }

    const autoTitle = generateProjectTitle({
      serviceType: 'labour_contractor',
      district: districtSelection.district,
    });

    const result = await createProjectAction({
      title: autoTitle,
      mistri_details: validated.details,
      district: districtSelection.district,
      state: districtSelection.state,
      pincode: form.pincode.trim() || undefined,
      bidding_minutes: parseInt(form.bidding_minutes, 10),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      revealInvalid();
      return;
    }

    setSubmittedTitle(autoTitle);
    setStep(4);
    setLoading(false);
  }

  const reviewBlocks = (() => {
    const validated =
      form.houseType === 'boundary_wall'
        ? validateMistriBoundaryWallInput(boundaryWallValidationInput())
        : validateMistriFloorWorkInput(mistriValidationInput());
    return 'details' in validated ? getMistriWorkRequirementBlocks(validated.details) : [];
  })();

  const showFoundationProvision = mistriFoundationProvisionRequired(assembledFloorWork);
  const showContractType =
    form.houseType === 'rcc' && mistriContractTypeRequiredForFloorWork(assembledFloorWork);
  const currentFloorPlan = currentFloorPlanFromFloorWork(assembledFloorWork);
  const currentUpper = floorPlanUpperCount(currentFloorPlan);
  const wall = form.boundaryWall;
  const boundaryWallAreaSqft = computeBoundaryWallAreaSqft(
    wall?.lengthFt,
    wall?.heightFt,
  );
  const autoPlasteringAreaSqft = computeBoundaryWallPlasteringAreaSqft(
    boundaryWallAreaSqft,
    wall?.plasteringFinish,
  );
  const showManualPlasteringArea =
    wall?.plasteringFinish != null &&
    wall?.plasteringFinish !== 'none' &&
    autoPlasteringAreaSqft == null;

  const futureCustomError = (() => {
    if (!showFoundationProvision) return null;
    const raw = form.futureFloorCustom.trim();
    if (!raw) return null;
    const n = parseFoundationCustomFloorCount(raw);
    if (n == null) return FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE;
    if (currentUpper != null && n <= currentUpper) return FOUNDATION_CAPACITY_INVALID_MESSAGE;
    return null;
  })();

  const minFoundationFloors =
    currentUpper != null ? currentUpper + 1 : 1;

  function goWizardBack() {
    if (step === 3 || step === 2) {
      setStep((current) => (current === 3 ? 2 : 1));
      return;
    }
    router.push('/');
  }

  return (
    <WizardAccentLabels>
    <div className="mx-auto w-full max-w-3xl space-y-6 text-slate-900 dark:text-slate-100 [overflow-anchor:none]">
      <div>
        <HistoryBackButton className="mb-2" onClick={goWizardBack} />
        <h1 className="text-xl font-bold text-foreground">Post Mistri Worker Project</h1>
      </div>

      {step < 4 && <WizardStepper labels={PROGRESS_LABELS} step={step} />}

      <Card className={FORM_SHELL_CARD}>
        <CardContent className="px-4 pt-5 pb-5 sm:px-6">
          {error && (
            <div
              className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-red-400"
              data-field-invalid="true"
              data-validation-banner="true"
              tabIndex={-1}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 [overflow-anchor:none]">
              <h2 className={FORM_HEADING}>Project Information</h2>

              <AssamDistrictAutocomplete
                value={form.location}
                onChange={(v) => update('location', v)}
                error={step1ValidationAttempted ? step1Errors.location : undefined}
              />

              <Input
                label="Pincode"
                type="text"
                inputMode="numeric"
                placeholder=""
                value={form.pincode}
                onChange={(e) => update('pincode', formatPincodeInput(e.target.value))}
                error={step1ValidationAttempted ? step1Errors.pincode : undefined}
              />

              <div
                className={cn(
                  FORM_SECTION_CARD,
                  '[overflow-anchor:none]',
                  step1ValidationAttempted && step1Errors.houseType && 'ring-1 ring-red-500',
                )}
                data-field-invalid={step1ValidationAttempted && step1Errors.houseType ? 'true' : undefined}
              >
                <label className={SECTION_LABEL}>{withSectionColon('Construction type')}</label>
                <div className="mt-1 grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
                  {MISTRI_HOUSE_TYPE_OPTIONS.map((opt) => (
                    <HouseTypeCard
                      key={opt.value}
                      type={opt.value}
                      label={opt.label}
                      selected={form.houseType === opt.value}
                      onClick={() => setHouseType(opt.value)}
                    />
                  ))}
                </div>
                <FieldError message={step1ValidationAttempted ? step1Errors.houseType : undefined} />
              </div>

              <div className="min-h-[7rem] space-y-4 [overflow-anchor:none]">
                {form.houseType !== 'boundary_wall' && (
                  <div className="min-h-[6.75rem]">
                    <Input
                      label={MISTRI_APPROXIMATE_AREA_LABEL}
                      type="text"
                      inputMode="decimal"
                      placeholder=""
                      value={form.approximateArea}
                      onChange={(e) => {
                        update('approximateArea', e.target.value);
                        setStep1Errors((prev) => ({ ...prev, builtUpArea: undefined }));
                      }}
                      error={step1ValidationAttempted ? step1Errors.builtUpArea : undefined}
                    />
                    <p className={FORM_NOTE}>
                      *Note: Built-up covered area of a single floor.
                    </p>
                  </div>
                )}

                {form.houseType === 'rcc' && (
                  <div className={cn(FORM_SECTION_CARD, 'space-y-3')}>
                    <label className={SECTION_LABEL}>{withSectionColon('Target Work Floor')}</label>
                    <p className={HELPER_TEXT}>
                      Select the specific floor(s) where work will be executed for this project.
                    </p>
                    <BuildingTypeSelector
                      purpose="mistri"
                      rccOnly
                      allowNonSequentialFloors
                      value={form.buildingTypes}
                      onChange={setBuildingTypes}
                      showCustomFloor
                      customSelected={form.customFloorSelected}
                      customFloors={form.customFloors}
                      onCustomChange={setCustomFloor}
                      error={step1ValidationAttempted ? step1Errors.floors : null}
                      customError={step1ValidationAttempted ? step1Errors.customFloor : null}
                    />
                  </div>
                )}
              </div>

              <div
                className={cn(FORM_SECTION_CARD, 'space-y-3')}
                data-field-invalid={step1ValidationAttempted && step1Errors.bidding ? 'true' : undefined}
              >
                <label className={SECTION_LABEL}>
                  {withSectionColon('Bidding Duration')}
                </label>
                <Select value={form.bidding_minutes} onValueChange={(v) => update('bidding_minutes', v)}>
                  <SelectTrigger className={step1ValidationAttempted && step1Errors.bidding ? 'border-red-500 ring-1 ring-red-500' : undefined}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Minutes (Quick)</SelectItem>
                    <SelectItem value="1440">24 Hours (Standard)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={step1ValidationAttempted ? step1Errors.bidding : undefined} />
                <p className="text-[11px] font-medium text-blue-600">
                  After bidding closes you have 5 minutes to select a mistri worker.
                </p>
              </div>

              <Button size="lg" className={cn('w-full', FORM_CONTINUE_BTN)} onClick={tryGoStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className={FORM_HEADING}>Work Requirements</h2>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {form.houseType === 'boundary_wall'
                    ? 'Enter boundary wall dimensions, material, plastering, and execution timeline.'
                    : form.buildingTypes.includes(ASSAM_BUILDING_TYPE)
                    ? 'Assam Type — Full finishing upto Plastering and Roof work is included. Choose roof truss, roofing sheet, flooring, and foundation depth.'
                    : "Choose one Scope of Work for each selected floor based on your site's current status."}
                </p>
              </div>

              {step2Error && (
                <div
                  className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-red-400"
                  data-field-invalid="true"
                  data-validation-banner="true"
                  tabIndex={-1}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              {form.houseType === 'boundary_wall' ? (
                <div className={FORM_SECTION_CARD}>
                  <label className={SECTION_LABEL}>
                    {withSectionColon('Boundary Wall Work Details')}
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Approximate Length (ft)"
                      type="text"
                      inputMode="decimal"
                      placeholder=""
                      value={form.boundaryWall?.lengthFt ?? ''}
                      error={step2FieldErrors.length || (messageMatches(step2Error, 'length') ? step2Error ?? undefined : undefined)}
                      onChange={(e) => patchBoundaryWall({ lengthFt: e.target.value })}
                    />
                    <Input
                      label="Height (ft)"
                      type="text"
                      inputMode="decimal"
                      placeholder=""
                      value={form.boundaryWall?.heightFt ?? ''}
                      error={step2FieldErrors.height || (messageMatches(step2Error, 'height') ? step2Error ?? undefined : undefined)}
                      onChange={(e) => patchBoundaryWall({ heightFt: e.target.value })}
                    />
                  </div>
                  {boundaryWallAreaSqft != null && (
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                      Approximate Total Wall Area: {boundaryWallAreaSqft.toLocaleString('en-IN')} sq. ft.
                    </p>
                  )}

                  <NestedChoiceButtons
                    question="Material / Brick Selection"
                    invalid={Boolean(step2FieldErrors.material) || messageMatches(step2Error, 'wall material') || messageMatches(step2Error, 'brick')}
                    options={MISTRI_BOUNDARY_WALL_MATERIAL_OPTIONS}
                    value={form.boundaryWall?.materialType ?? null}
                    columns={2}
                    onChange={(v) => patchBoundaryWall({ materialType: v })}
                  />

                  <NestedChoiceButtons
                    question="Plastering Options"
                    invalid={Boolean(step2FieldErrors.plaster) || messageMatches(step2Error, 'plastering option') || messageMatches(step2Error, 'plastering finish')}
                    options={MISTRI_BOUNDARY_WALL_PLASTER_OPTIONS}
                    value={form.boundaryWall?.plasteringFinish ?? null}
                    onChange={(v) => patchBoundaryWall({ plasteringFinish: v })}
                  />
                  {autoPlasteringAreaSqft != null && (
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                      Estimated Plastering Surface Area:{' '}
                      {autoPlasteringAreaSqft.toLocaleString('en-IN')} sq. ft.
                    </p>
                  )}
                  {showManualPlasteringArea && (
                    <Input
                      label="Approximate Plastering Area (sq. ft.)"
                      type="text"
                      inputMode="decimal"
                      placeholder=""
                      error={step2FieldErrors.plasterArea || (messageMatches(step2Error, 'plastering area') ? step2Error ?? undefined : undefined)}
                      value={form.boundaryWall?.plasteringAreaSqft ?? ''}
                      onChange={(e) =>
                        patchBoundaryWall({ plasteringAreaSqft: e.target.value })
                      }
                    />
                  )}

                  <NestedChoiceButtons
                    question="Work Execution Timeline"
                    invalid={Boolean(step2FieldErrors.timeline) || messageMatches(step2Error, 'execution timeline')}
                    options={MISTRI_BOUNDARY_WALL_TIMELINE_OPTIONS}
                    value={form.boundaryWall?.executionTimeline ?? null}
                    columns={4}
                    onChange={(v) =>
                      patchBoundaryWall({
                        executionTimeline: v,
                        executionTimelineCustomDate:
                          v === 'custom' ? form.boundaryWall?.executionTimelineCustomDate ?? '' : '',
                      })
                    }
                  />
                  {form.boundaryWall?.executionTimeline === 'custom' && (
                    <Input
                      label="Custom Date"
                      type="date"
                      min={todayLocalDateString()}
                      error={step2FieldErrors.customDate || (messageMatches(step2Error, 'completion date') || messageMatches(step2Error, 'start date') ? step2Error ?? undefined : undefined)}
                      value={form.boundaryWall?.executionTimelineCustomDate ?? ''}
                      onChange={(e) =>
                        patchBoundaryWall({ executionTimelineCustomDate: e.target.value })
                      }
                    />
                  )}
                </div>
              ) : (
                <>
              <div className="space-y-6">
              {assembledFloorWork.map((fw) => {
                const key = floorWorkKey(fw.floorId, fw.customFloorNumber);
                const entry = form.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
                const isAssam = isAssamMistriFloor(fw.floorId);
                const selectedScopes = rccScopesFromWorkTypes(
                  entry.workTypes,
                  entry.includeFineFlooring,
                );
                const wallPlasterMode = wallPlasterWorkModeFromWorkTypes(entry.workTypes);
                const title = formatMistriFloorWorkLabel(fw);

                return (
                  <div
                    key={key}
                    className={cn(
                      FORM_SECTION_CARD,
                      'border-b border-slate-100 pb-6 last:border-b-0 last:pb-0 [overflow-anchor:none]',
                      step2Error?.includes(title) && 'ring-1 ring-red-500',
                    )}
                    data-field-invalid={step2Error?.includes(title) ? 'true' : undefined}
                  >
                    <div className="space-y-1.5">
                      <p className={FORM_BADGE}>
                        {title}
                      </p>
                      <p className={HELPER_TEXT}>
                        {isAssam
                          ? 'Full finishing upto Plastering and Roof work is included. Select roof truss, roofing sheet, flooring, and foundation depth.'
                          : 'Select the scope of work for this floor. Flooring can be combined with Full Construction or Wall Brick Work.'}
                      </p>
                    </div>

                    {isAssam ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Full finishing upto Plastering and Roof work
                          </p>
                          <p className={cn('mt-1', HELPER_TEXT)}>
                            {getMistriFullFinishedIncludes(fw.floorId)}
                          </p>
                        </div>

                        <NestedChoiceButtons
                          question="Roof Truss Type"
                          options={MISTRI_ASSAM_ROOF_OPTIONS}
                          value={entry.assamRoofType}
                          onChange={(v) =>
                            patchFloorWork(fw.floorId, { assamRoofType: v }, fw.customFloorNumber)
                          }
                        />

                        <NestedChoiceButtons
                          question="Roofing Sheet Material"
                          options={MISTRI_ASSAM_ROOFING_SHEET_OPTIONS}
                          value={entry.assamRoofingSheet}
                          onChange={(v) =>
                            patchFloorWork(
                              fw.floorId,
                              { assamRoofingSheet: v },
                              fw.customFloorNumber,
                            )
                          }
                        />

                        <div className={FORM_NESTED_PANEL}>
                          <NestedChoiceButtons
                            question="Do you also want flooring (Tile / Marble / Smooth Cement Finish)?"
                            options={MISTRI_YES_NO_OPTIONS}
                            value={
                              entry.includeFineFlooring === true
                                ? 'yes'
                                : entry.includeFineFlooring === false
                                  ? 'no'
                                  : null
                            }
                            onChange={(v) =>
                              patchFloorWork(
                                fw.floorId,
                                {
                                  includeFineFlooring: v === 'yes',
                                  flooringMaterial:
                                    v === 'yes' ? entry.flooringMaterial : null,
                                  flooringAreaSqft: v === 'yes' ? entry.flooringAreaSqft : '',
                                },
                                fw.customFloorNumber,
                              )
                            }
                          />
                          {entry.includeFineFlooring === true && (
                            <>
                            <NestedChoiceButtons
                              question="What flooring material will be used?"
                              options={MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS}
                              value={entry.flooringMaterial}
                              columns={3}
                              onChange={(v) =>
                                patchFloorWork(
                                  fw.floorId,
                                  { flooringMaterial: v },
                                  fw.customFloorNumber,
                                )
                              }
                            />
                            <FlooringAreaField
                              value={entry.flooringAreaSqft}
                              error={flooringAreaExceedsPlinthError(
                                entry.flooringAreaSqft,
                                form.approximateArea,
                              )}
                              onChange={(value) =>
                                patchFloorWork(
                                  fw.floorId,
                                  { flooringAreaSqft: value },
                                  fw.customFloorNumber,
                                )
                              }
                            />
                            </>
                          )}
                        </div>

                        <div className="space-y-3">
                          <label className={SECTION_LABEL}>
                            {withSectionColon('Foundation depth (ft)')}
                          </label>
                          <Input
                            type="number"
                            min={0.1}
                            step="0.1"
                            inputMode="decimal"
                            placeholder=""
                            value={entry.foundationDepthFt}
                            onChange={(e) =>
                              patchFloorWork(
                                fw.floorId,
                                { foundationDepthFt: e.target.value },
                                fw.customFloorNumber,
                              )
                            }
                          />
                          <p className={HELPER_TEXT}>
                            Enter the required foundation depth in feet.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 [overflow-anchor:none]">
                        {MISTRI_RCC_SCOPE_OPTIONS.map((opt) => {
                          const selected = selectedScopes.includes(opt.value);
                          const finishingLockedByLower =
                            opt.value === 'wall_plaster_only' &&
                            isFinishingScopeBlockedByLowerStructure(
                              fw.floorId,
                              assembledFloorWork,
                              fw.customFloorNumber,
                            );
                          const flooringLocked = isFlooringWorkLocked(
                            selectedScopes,
                            fw.floorId,
                            assembledFloorWork,
                            fw.customFloorNumber,
                          );
                          const comboDisabled = isRccScopeDisabled(selectedScopes, opt.value);
                          const disabled =
                            comboDisabled ||
                            finishingLockedByLower ||
                            (opt.value === 'flooring_only' && flooringLocked);
                          const lockNote =
                            finishingLockedByLower ||
                            (opt.value === 'flooring_only' &&
                              flooringLocked &&
                              !selectedScopes.includes('frame_only'))
                              ? finishingScopeLockedByLowerStructureMessage(
                                  fw.floorId,
                                  fw.customFloorNumber,
                                )
                              : undefined;

                          return (
                            <div key={opt.value} className="w-full space-y-2 [overflow-anchor:none]">
                              <OptionCardButton
                                selected={selected && !disabled}
                                disabled={disabled}
                                locked={disabled}
                                note={lockNote}
                                marker="checkbox"
                                onClick={() =>
                                  toggleRccScope(fw.floorId, opt.value, fw.customFloorNumber)
                                }
                              >
                                <span className="block">
                                  <span className="block">
                                    Option {opt.optionNumber}: {opt.title}
                                  </span>
                                  <span className="mt-1 block text-[11px] font-medium leading-snug text-slate-500">
                                    {getMistriRccScopeLabel(fw.floorId, opt.value)}
                                  </span>
                                </span>
                              </OptionCardButton>
                              {opt.value === 'wall_plaster_only' && selected && !finishingLockedByLower && (
                                <div className="w-full space-y-3">
                                  <NestedChoiceButtons
                                    question="Select the work required on this floor"
                                    options={MISTRI_WALL_PLASTER_WORK_OPTIONS}
                                    value={wallPlasterMode ?? 'both'}
                                    onChange={(v) =>
                                      setWallPlasterWorkMode(
                                        fw.floorId,
                                        v,
                                        fw.customFloorNumber,
                                      )
                                    }
                                  />
                                  {wallPlasterMode !== 'plastering' && (
                                    <NestedChoiceButtons
                                      question="What type of wall material will be used?"
                                      options={MISTRI_BRICKWORK_MATERIAL_OPTIONS}
                                      value={entry.brickMaterial}
                                      onChange={(v) =>
                                        patchFloorWork(
                                          fw.floorId,
                                          { brickMaterial: v },
                                          fw.customFloorNumber,
                                        )
                                      }
                                    />
                                  )}
                                  <WallAreaField
                                    value={entry.wallAreaSqft}
                                    plinthArea={form.approximateArea}
                                    onChange={(value) =>
                                      patchFloorWork(
                                        fw.floorId,
                                        { wallAreaSqft: value },
                                        fw.customFloorNumber,
                                      )
                                    }
                                  />
                                </div>
                              )}
                              {opt.value === 'flooring_only' && selected && !disabled && (
                                <div className="w-full space-y-4">
                                  <NestedChoiceButtons
                                    question="What flooring material will be used?"
                                    options={MISTRI_FLOORING_MATERIAL_OPTIONS}
                                    value={
                                      entry.flooringMaterial === 'tile' ||
                                      entry.flooringMaterial === 'marble' ||
                                      entry.flooringMaterial === 'granite'
                                        ? entry.flooringMaterial
                                        : null
                                    }
                                    columns={3}
                                    onChange={(v) =>
                                      patchFloorWork(
                                        fw.floorId,
                                        {
                                          includeFineFlooring: true,
                                          flooringMaterial: v,
                                          flooringAreaSqft:
                                            entry.flooringAreaSqft.trim() ||
                                            form.approximateArea,
                                        },
                                        fw.customFloorNumber,
                                      )
                                    }
                                  />
                                  <FlooringAreaField
                                    value={entry.flooringAreaSqft}
                                    error={flooringAreaExceedsPlinthError(
                                      entry.flooringAreaSqft,
                                      form.approximateArea,
                                    )}
                                    onChange={(value) =>
                                      patchFloorWork(
                                        fw.floorId,
                                        { flooringAreaSqft: value },
                                        fw.customFloorNumber,
                                      )
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>

              {showFoundationProvision && (
                <div
                  className={cn(FORM_SECTION_CARD, messageMatches(step2Error, 'foundation') && 'ring-1 ring-red-500')}
                  data-field-invalid={messageMatches(step2Error, 'foundation') ? 'true' : undefined}
                >
                  <p className={SECTION_LABEL}>
                    {withSectionColon('Foundation Provision (No. of Floors)')}
                  </p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder=""
                    error={messageMatches(step2Error, 'foundation') ? step2Error ?? undefined : undefined}
                    value={form.futureFloorCustom}
                    onChange={(e) => {
                      update('futureFloorCustom', e.target.value.replace(/\D/g, ''));
                      setStep2Error(null);
                    }}
                  />
                  <p className={FORM_NOTE_BOX}>{FOUNDATION_PROVISION_NOTE}</p>
                  <FieldError message={futureCustomError} />
                </div>
              )}

              {showContractType && (
                <div
                  className={cn(FORM_SECTION_CARD, messageMatches(step2Error, 'contract type') && 'ring-1 ring-red-500')}
                  data-field-invalid={messageMatches(step2Error, 'contract type') ? 'true' : undefined}
                >
                  <label className={SECTION_LABEL}>
                    {withSectionColon('Contract Type (Work Scope)')}
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {MISTRI_CONTRACT_TYPE_OPTIONS.map((opt) => (
                      <OptionCardButton
                        key={opt.value}
                        selected={form.contractType === opt.value}
                        onClick={() => {
                          update('contractType', opt.value);
                          setStep2Error(null);
                        }}
                      >
                        {opt.label}
                      </OptionCardButton>
                    ))}
                  </div>
                </div>
              )}
                </>
              )}

              {form.houseType !== 'boundary_wall' && (
              <div
                className={cn(
                  FORM_SECTION_CARD,
                  messageMatches(step2Error, 'when the project should start') && 'ring-1 ring-red-500',
                )}
                data-field-invalid={messageMatches(step2Error, 'when the project should start') ? 'true' : undefined}
              >
                <label className={SECTION_LABEL}>
                  {withSectionColon('Work Start Timeline')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MISTRI_START_TIME_OPTIONS.map((opt) => (
                    <OptionCardButton
                      key={opt.value}
                      selected={form.projectStartTimeType === opt.value}
                      onClick={() => {
                        update('projectStartTimeType', opt.value);
                        if (opt.value !== 'specific') {
                          update('projectStartTimeSpecificDate', '');
                        }
                        setStep2Error(null);
                      }}
                    >
                      {opt.label}
                    </OptionCardButton>
                  ))}
                </div>
                {form.projectStartTimeType === 'specific' && (
                  <ProjectStartDatePicker
                    value={form.projectStartTimeSpecificDate}
                    error={
                      messageMatches(step2Error, 'specific project start date') ||
                      messageMatches(step2Error, 'start date') ||
                      messageMatches(step2Error, 'past date') ||
                      messageMatches(step2Error, 'valid date')
                        ? step2Error ?? undefined
                        : undefined
                    }
                    onChange={(value) => {
                      update('projectStartTimeSpecificDate', value);
                      setStep2Error(null);
                    }}
                  />
                )}
              </div>
              )}

              <div className={FORM_SECTION_CARD}>
                <label className={SECTION_LABEL}>
                  <span>
                    Additional Requirements <span className="normal-case tracking-normal">(optional)</span>:
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder={ADDITIONAL_REQUIREMENTS_PLACEHOLDER}
                  value={form.additionalRequirements}
                  onChange={(e) => {
                    update('additionalRequirements', e.target.value);
                    setStep2Error(null);
                  }}
                  className={FORM_TEXTAREA}
                />
              </div>

              <WizardContinueGuidance />

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  className={cn('flex-1', FORM_CONTINUE_BTN)}
                  disabled={Boolean(flooringPlinthCapError())}
                  onClick={tryGoStep3}
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className={FORM_HEADING}>Review & Launch Auction</h2>

              <ReviewSummaryList
                items={[
                  { label: 'Project Title', value: previewTitle },
                  {
                    label: 'Construction Type',
                    value:
                      form.houseType === 'assam'
                        ? 'Assam Type'
                        : form.houseType === 'boundary_wall'
                          ? 'Boundary Wall'
                          : 'RCC Structure',
                  },
                  { label: 'District', value: form.location },
                  {
                    label: 'Pincode',
                    value: form.pincode.trim() || 'Not specified',
                  },
                  ...reviewBlocks,
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
                    <span>Launch Auction</span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Auction Launched! 🎉</h2>
                <p className="text-sm font-medium text-slate-600">
                  Your project <strong className="text-foreground">&quot;{submittedTitle}&quot;</strong> is now live.
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep(1);
                    setForm(EMPTY_FORM);
                    setSubmittedTitle('');
                    setStep1ValidationAttempted(false);
                    setStep1Errors({});
                    setStep2Error(null);
                  }}
                >
                  Post Another
                </Button>
                <Button className="flex-1" onClick={() => router.push('/dashboard/owner')}>
                  View Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </WizardAccentLabels>
  );
}
