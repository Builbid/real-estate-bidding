'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
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
import type { BuildingType } from '@/lib/buildingConfig';
import { ASSAM_BUILDING_TYPE } from '@/lib/buildingConfig';
import {
  getCustomFloorSequenceInvalidMessage,
  FOUNDATION_CAPACITY_INVALID_MESSAGE,
  FOUNDATION_CUSTOM_FLOORS_INVALID_MESSAGE,
  MISTRI_ASSAM_FLOORING_MATERIAL_OPTIONS,
  MISTRI_ASSAM_ROOF_OPTIONS,
  MISTRI_ASSAM_ROOFING_SHEET_OPTIONS,
  MISTRI_BRICKWORK_MATERIAL_OPTIONS,
  MISTRI_CONTRACT_TYPE_OPTIONS,
  MISTRI_CUSTOM_FLOOR_ID,
  MISTRI_FLOORING_MATERIAL_OPTIONS,
  MISTRI_RCC_SCOPE_OPTIONS,
  MISTRI_START_TIME_OPTIONS,
  MISTRI_YES_NO_OPTIONS,
  UPPER_FLOOR_WALL_LOCKED_BY_LOWER_STRUCTURE,
  UPPER_FLOOR_STRUCTURAL_REQUIRES_LOWER_FRAME,
  OPTION_3_REQUIRES_EXISTING_SLAB,
  currentFloorPlanFromFloorWork,
  floorPlanUpperCount,
  formatMistriFloorWorkLabel,
  formatMistriRccScopeDescription,
  getMistriFullFinishedIncludes,
  getMistriRccScopeLabel,
  getMistriWorkRequirementBlocks,
  isAssamMistriFloor,
  isUpperFloorWallScopeBlocked,
  isUpperFloorStructuralScopeBlocked,
  isWallPlasterScopeBlocked,
  mistriContractTypeRequiredForFloorWork,
  mistriFloorUpperCount,
  mistriFoundationProvisionRequired,
  parseCustomFloorSequence,
  parseFoundationCustomFloorCount,
  parseApproximateAreaSqft,
  parseFoundationDepthFt,
  rccScopeFromWorkTypes,
  sortMistriFloorWork,
  validateMistriFloorWorkInput,
  workTypesFromRccScope,
  type MistriAssamRoofType,
  type MistriAssamRoofingSheet,
  type MistriBrickworkMaterial,
  type MistriContractType,
  type MistriFloorId,
  type MistriFloorWork,
  type MistriFloorWorkType,
  type MistriFlooringMaterial,
  type MistriPlasterScope,
  type MistriRccScopeOption,
  type MistriStartTimeType,
} from '@/lib/mistriDetails';
import { cn } from '@/lib/utils';
import { createProjectAction } from '@/app/actions/createProject';

type Step = 1 | 2 | 3 | 4;

const BIDDING_MINUTES = 7;

const SECTION_LABEL =
  'text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider';
const HELPER_TEXT =
  'text-[11px] font-medium text-gray-700 dark:text-zinc-300 leading-relaxed';

const FORM_SECTION_CARD =
  'rounded-xl border border-teal-500/30 bg-slate-50/50 p-5 space-y-3 dark:border-teal-500/25 dark:bg-slate-900/20';

const FLOOR_CARD_THEMES = [
  {
    card: 'border-sky-300/90 bg-gradient-to-br from-sky-100 via-sky-50 to-white shadow-sky-200/50 dark:from-sky-950/50 dark:via-sky-950/20 dark:to-card dark:border-sky-500/35 dark:shadow-none',
    bar: 'bg-sky-500',
    badge: 'bg-sky-600 text-white',
  },
  {
    card: 'border-violet-300/90 bg-gradient-to-br from-violet-100 via-violet-50 to-white shadow-violet-200/50 dark:from-violet-950/50 dark:via-violet-950/20 dark:to-card dark:border-violet-500/35 dark:shadow-none',
    bar: 'bg-violet-500',
    badge: 'bg-violet-600 text-white',
  },
  {
    card: 'border-amber-300/90 bg-gradient-to-br from-amber-100 via-amber-50 to-white shadow-amber-200/50 dark:from-amber-950/50 dark:via-amber-950/20 dark:to-card dark:border-amber-500/35 dark:shadow-none',
    bar: 'bg-amber-500',
    badge: 'bg-amber-600 text-white',
  },
  {
    card: 'border-rose-300/90 bg-gradient-to-br from-rose-100 via-rose-50 to-white shadow-rose-200/50 dark:from-rose-950/50 dark:via-rose-950/20 dark:to-card dark:border-rose-500/35 dark:shadow-none',
    bar: 'bg-rose-500',
    badge: 'bg-rose-600 text-white',
  },
  {
    card: 'border-teal-300/90 bg-gradient-to-br from-teal-100 via-teal-50 to-white shadow-teal-200/50 dark:from-teal-950/50 dark:via-teal-950/20 dark:to-card dark:border-teal-500/35 dark:shadow-none',
    bar: 'bg-teal-500',
    badge: 'bg-teal-600 text-white',
  },
  {
    card: 'border-indigo-300/90 bg-gradient-to-br from-indigo-100 via-indigo-50 to-white shadow-indigo-200/50 dark:from-indigo-950/50 dark:via-indigo-950/20 dark:to-card dark:border-indigo-500/35 dark:shadow-none',
    bar: 'bg-indigo-500',
    badge: 'bg-indigo-600 text-white',
  },
  {
    card: 'border-orange-300/90 bg-gradient-to-br from-orange-100 via-orange-50 to-white shadow-orange-200/50 dark:from-orange-950/50 dark:via-orange-950/20 dark:to-card dark:border-orange-500/35 dark:shadow-none',
    bar: 'bg-orange-500',
    badge: 'bg-orange-600 text-white',
  },
  {
    card: 'border-fuchsia-300/90 bg-gradient-to-br from-fuchsia-100 via-fuchsia-50 to-white shadow-fuchsia-200/50 dark:from-fuchsia-950/50 dark:via-fuchsia-950/20 dark:to-card dark:border-fuchsia-500/35 dark:shadow-none',
    bar: 'bg-fuchsia-500',
    badge: 'bg-fuchsia-600 text-white',
  },
] as const;

const ASSAM_CARD_THEME = {
  card: 'border-emerald-300/90 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white shadow-emerald-200/50 dark:from-emerald-950/50 dark:via-emerald-950/20 dark:to-card dark:border-emerald-500/35 dark:shadow-none',
  bar: 'bg-emerald-500',
  badge: 'bg-emerald-600 text-white',
} as const;

function floorCardTheme(floorId: MistriFloorId, customFloorNumber?: number | null) {
  if (isAssamMistriFloor(floorId)) return ASSAM_CARD_THEME;
  const level = mistriFloorUpperCount(floorId, customFloorNumber);
  return FLOOR_CARD_THEMES[Math.abs(level) % FLOOR_CARD_THEMES.length];
}

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
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
        Approximate Flooring Work Area (sq. ft.)
      </label>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="e.g., 1800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function WallAreaField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
        Approximate Wall Area (sq. ft.)
      </label>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="e.g., 1200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left text-sm font-semibold transition-all',
        selected
          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'text-gray-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-border dark:bg-card dark:text-zinc-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-500/10',
        disabled && 'cursor-not-allowed opacity-50 grayscale hover:border-gray-200 hover:bg-white dark:hover:border-border dark:hover:bg-card',
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {locked ? (
        <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      ) : selected ? (
        <span
          aria-hidden
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 dark:border-emerald-400"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
        </span>
      ) : (
        <span
          aria-hidden
          className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-gray-300 dark:border-zinc-500"
        />
      )}
    </button>
  );
}

function NestedChoiceButtons<T extends string>({
  question,
  options,
  value,
  onChange,
  columns = 1,
}: {
  question: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">{question}</p>
      <div
        className={cn(
          'grid gap-2',
          columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        {options.map((opt) => (
          <OptionCardButton
            key={opt.value}
            selected={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </OptionCardButton>
        ))}
      </div>
    </div>
  );
}

const PROGRESS_LABELS = [
  'Project Info',
  'Work Requirements',
  'Review & Launch',
] as const;

type MistriHouseType = 'assam' | 'rcc';

const MISTRI_HOUSE_TYPE_OPTIONS: {
  value: MistriHouseType;
  label: string;
}[] = [
  { value: 'assam', label: 'Assam Type' },
  { value: 'rcc', label: 'RCC Structure' },
];

function AssamTypeGraphic() {
  return (
    <svg viewBox="0 0 128 96" className="h-10 w-[3.25rem]" aria-hidden>
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
    <svg viewBox="0 0 128 96" className="h-10 w-[3.25rem]" aria-hidden>
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
      onClick={onClick}
      className={cn(
        'relative flex min-h-[5.75rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all',
        selected
          ? 'border-emerald-500/70 bg-emerald-500/15 shadow-sm shadow-emerald-500/10'
          : 'border-border bg-card hover:border-emerald-400/60 hover:bg-emerald-500/5',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-12 items-center justify-center rounded-lg',
          type === 'assam' ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-sky-100 dark:bg-sky-500/15',
        )}
      >
        {type === 'assam' ? <AssamTypeGraphic /> : <RccStructureGraphic />}
      </span>
      <span className="text-xs font-semibold text-gray-900 dark:text-white">{label}</span>
      {selected ? (
        <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-emerald-500 dark:text-emerald-400" />
      ) : (
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 h-4 w-4 rounded-full border border-gray-300 dark:border-zinc-500"
        />
      )}
    </button>
  );
}

interface FormState {
  location: string;
  pincode: string;
  bidding_minutes: string;
  houseType: MistriHouseType | null;
  buildingTypes: BuildingType[];
  customFloorSelected: boolean;
  customFloorNumber: string;
  floorWorkById: Record<string, FloorWorkForm>;
  approximateArea: string;
  /** Whole-number floor count for foundation provision (Ground Floor major only). */
  futureFloorCustom: string;
  contractType: MistriContractType | null;
  projectStartTimeType: MistriStartTimeType | null;
  projectStartTimeSpecificDate: string;
  additionalRequirements: string;
  includeDoorWindowFrames: boolean;
}

const EMPTY_FORM: FormState = {
  location: '',
  pincode: '',
  bidding_minutes: String(BIDDING_MINUTES),
  houseType: null,
  buildingTypes: [],
  customFloorSelected: false,
  customFloorNumber: '',
  floorWorkById: {},
  approximateArea: '',
  futureFloorCustom: '',
  contractType: null,
  projectStartTimeType: null,
  projectStartTimeSpecificDate: '',
  additionalRequirements: '',
  includeDoorWindowFrames: false,
};

function selectedFloorEntries(form: FormState): Array<{
  floorId: MistriFloorId;
  customFloorNumber: number | null;
}> {
  const entries: Array<{ floorId: MistriFloorId; customFloorNumber: number | null }> =
    form.buildingTypes.map((floorId) => ({ floorId, customFloorNumber: null }));

  if (form.customFloorSelected) {
    const sequence = parseCustomFloorSequence(form.customFloorNumber, {
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

function scopeSnapshotFromById(
  form: Pick<FormState, 'buildingTypes' | 'customFloorSelected' | 'customFloorNumber'>,
  floorWorkById: Record<string, FloorWorkForm>,
): MistriFloorWork[] {
  return selectedFloorEntries(form as FormState).map((entry) => {
    const work = floorWorkById[floorWorkKey(entry.floorId, entry.customFloorNumber)] ?? EMPTY_FLOOR_WORK;
    return {
      floorId: entry.floorId,
      customFloorNumber: entry.customFloorNumber,
      workTypes: work.workTypes,
      brickMaterial: work.brickMaterial,
      plasterScope: work.plasterScope,
      flooringMaterial: work.flooringMaterial,
      includeFineFlooring: work.includeFineFlooring,
      flooringAreaSqft: parseApproximateAreaSqft(work.flooringAreaSqft),
      wallAreaSqft: parseApproximateAreaSqft(work.wallAreaSqft),
      scopeOption: rccScopeFromWorkTypes(work.workTypes),
      scopeLabel: null,
      assamRoofType: work.assamRoofType,
      assamRoofingSheet: work.assamRoofingSheet,
      foundationDepthFt: parseFoundationDepthFt(work.foundationDepthFt),
    };
  });
}

function resetLockedStructuralFloors(
  form: Pick<FormState, 'buildingTypes' | 'customFloorSelected' | 'customFloorNumber'>,
  floorWorkById: Record<string, FloorWorkForm>,
): { next: Record<string, FloorWorkForm>; changed: boolean } {
  const snapshot = scopeSnapshotFromById(form, floorWorkById);
  const next = { ...floorWorkById };
  let changed = false;
  for (const entry of selectedFloorEntries(form as FormState)) {
    if (isAssamMistriFloor(entry.floorId)) continue;
    if (!isUpperFloorStructuralScopeBlocked(entry.floorId, snapshot, entry.customFloorNumber)) {
      continue;
    }
    const key = floorWorkKey(entry.floorId, entry.customFloorNumber);
    const current = next[key];
    if (!current) continue;
    const scope = rccScopeFromWorkTypes(current.workTypes);
    if (!scope || scope === 'wall_plaster_only') continue;
    next[key] = {
      ...current,
      workTypes: [],
      brickMaterial: null,
      plasterScope: null,
      flooringMaterial: null,
      includeFineFlooring: null,
      flooringAreaSqft: '',
      wallAreaSqft: '',
    };
    changed = true;
  }
  return { next, changed };
}

function resetLockedWallFloorsToFullConstruction(
  form: Pick<FormState, 'buildingTypes' | 'customFloorSelected' | 'customFloorNumber'>,
  floorWorkById: Record<string, FloorWorkForm>,
): { next: Record<string, FloorWorkForm>; changed: boolean } {
  const snapshot = scopeSnapshotFromById(form, floorWorkById);
  const next = { ...floorWorkById };
  let changed = false;
  for (const entry of selectedFloorEntries(form as FormState)) {
    if (isAssamMistriFloor(entry.floorId)) continue;
    if (!isWallPlasterScopeBlocked(entry.floorId, snapshot, entry.customFloorNumber)) continue;
    const key = floorWorkKey(entry.floorId, entry.customFloorNumber);
    const current = next[key];
    if (!current) continue;
    if (rccScopeFromWorkTypes(current.workTypes) !== 'wall_plaster_only') continue;
    next[key] = {
      ...current,
      workTypes: workTypesFromRccScope('full_construction'),
      brickMaterial: null,
      plasterScope: null,
      flooringMaterial: null,
      includeFineFlooring: null,
      flooringAreaSqft: '',
      wallAreaSqft: '',
    };
    changed = true;
  }
  return { next, changed };
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
  const [step1Errors, setStep1Errors] = useState<{
    location?: string;
    pincode?: string;
    builtUpArea?: string;
    houseType?: string;
    floors?: string;
    customFloor?: string;
  }>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submittedTitle, setSubmittedTitle] = useState('');

  const districtSelection = parseAssamDistrictSelection(form.location);
  const parsedCustomSequence = parseCustomFloorSequence(form.customFloorNumber, {
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
    form.customFloorNumber,
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

  // If a lower floor uses Option 1/2, reset Option 3 on every higher floor to Option 1.
  // Clear Option 1/2 on floors missing structural continuity from below.
  useEffect(() => {
    if (step !== 2) return;
    if (form.houseType !== 'rcc') return;
    setForm((f) => {
      let floorWorkById = f.floorWorkById;
      const structuralReset = resetLockedStructuralFloors(f, floorWorkById);
      if (structuralReset.changed) {
        floorWorkById = structuralReset.next;
      }
      const { next, changed } = resetLockedWallFloorsToFullConstruction(f, floorWorkById);
      if (!structuralReset.changed && !changed) return f;
      return { ...f, floorWorkById: next };
    });
  }, [step, form.houseType, form.buildingTypes, form.customFloorSelected, form.customFloorNumber, form.floorWorkById]);

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

  function setHouseType(next: MistriHouseType) {
    setForm((f) => {
      if (f.houseType === next) return f;
      if (next === 'assam') {
        return {
          ...f,
          houseType: 'assam',
          buildingTypes: [ASSAM_BUILDING_TYPE],
          customFloorSelected: false,
          customFloorNumber: '',
          floorWorkById: {
            [ASSAM_BUILDING_TYPE]: { ...ASSAM_FULL_FINISHED_WORK },
          },
          futureFloorCustom: '',
          contractType: 'labor_only',
        };
      }
      return {
        ...f,
        houseType: 'rcc',
        buildingTypes: [],
        customFloorSelected: false,
        customFloorNumber: '',
        floorWorkById: {},
        futureFloorCustom: '',
        contractType: null,
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

  function setCustomFloor(selected: boolean, number: string) {
    setForm((f) => {
      if (f.houseType === 'assam') return f;
      const draft: FormState = {
        ...f,
        customFloorSelected: selected,
        customFloorNumber: number,
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

  function setRccScope(
    floorId: MistriFloorId,
    option: MistriRccScopeOption,
    customFloorNumber?: number | null,
  ) {
    setForm((f) => {
      const key = floorWorkKey(floorId, customFloorNumber);
      const snapshot = scopeSnapshotFromById(f, f.floorWorkById);

      if (option === 'wall_plaster_only') {
        const withoutThis = snapshot.map((fw) => {
          const sameFloor =
            fw.floorId === floorId &&
            (fw.customFloorNumber ?? null) === (customFloorNumber ?? null);
          if (!sameFloor) return fw;
          return { ...fw, workTypes: [] as MistriFloorWorkType[], scopeOption: null };
        });
        if (isWallPlasterScopeBlocked(floorId, withoutThis, customFloorNumber)) {
          return f;
        }
      } else if (option === 'full_construction' || option === 'frame_only') {
        if (isUpperFloorStructuralScopeBlocked(floorId, snapshot, customFloorNumber)) {
          return f;
        }
      }

      const current = f.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
      const workTypes = workTypesFromRccScope(option);
      const nextFloor: FloorWorkForm = {
        ...current,
        workTypes,
        brickMaterial: option === 'wall_plaster_only' ? current.brickMaterial : null,
        plasterScope: option === 'wall_plaster_only' ? (current.plasterScope ?? 'both') : null,
        flooringMaterial:
          option === 'full_construction' && current.includeFineFlooring
            ? current.flooringMaterial
            : null,
        includeFineFlooring: option === 'full_construction' ? current.includeFineFlooring === true : null,
        flooringAreaSqft:
          option === 'full_construction' && current.includeFineFlooring
            ? current.flooringAreaSqft
            : '',
        wallAreaSqft: option === 'wall_plaster_only' ? current.wallAreaSqft : '',
      };

      let floorWorkById: Record<string, FloorWorkForm> = {
        ...f.floorWorkById,
        [key]: nextFloor,
      };

      if (option === 'full_construction' || option === 'frame_only') {
        floorWorkById = resetLockedWallFloorsToFullConstruction(f, floorWorkById).next;
        floorWorkById = resetLockedStructuralFloors(f, floorWorkById).next;
      }

      return { ...f, floorWorkById };
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

    const pincodeError = validatePincode(form.pincode);
    if (pincodeError) {
      errors.pincode = pincodeError;
    }

    if (parseApproximateAreaSqft(form.approximateArea) == null) {
      errors.builtUpArea = 'Enter the approximate built-up area in sqft.';
    }

    if (!form.houseType) {
      errors.houseType = 'Select Assam Type or RCC Structure.';
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
      return;
    }

    setStep1ValidationAttempted(false);
    setStep1Errors({});
    setStep(2);
  }

  function tryGoStep3() {
    const validated = validateMistriFloorWorkInput(mistriValidationInput());
    if ('error' in validated) {
      setStep2Error(validated.error);
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
      return;
    }

    if (hasContactInfo(form.additionalRequirements)) {
      setError('Remove contact details from additional requirements before submitting.');
      setLoading(false);
      return;
    }

    const validated = validateMistriFloorWorkInput(mistriValidationInput());
    if ('error' in validated) {
      setError(validated.error);
      setLoading(false);
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
      return;
    }

    setSubmittedTitle(autoTitle);
    setStep(4);
    setLoading(false);
  }

  const reviewBlocks = (() => {
    const validated = validateMistriFloorWorkInput(mistriValidationInput());
    return 'details' in validated ? getMistriWorkRequirementBlocks(validated.details) : [];
  })();

  const showFoundationProvision = mistriFoundationProvisionRequired(assembledFloorWork);
  const showContractType =
    form.houseType === 'rcc' && mistriContractTypeRequiredForFloorWork(assembledFloorWork);
  const currentFloorPlan = currentFloorPlanFromFloorWork(assembledFloorWork);
  const currentUpper = floorPlanUpperCount(currentFloorPlan);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Post Mistri Worker Project</h1>
        <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mt-1">
          Specify civil work scope clearly so mistri workers can bid without disputes.
        </p>
      </div>

      {step < 4 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PROGRESS_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
              <div
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0',
                  i + 1 < step ? 'bg-emerald-500 text-white' :
                  i + 1 === step ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' :
                  'bg-secondary text-muted-foreground',
                )}
              >
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs truncate',
                  i + 1 === step ? 'text-foreground font-semibold' : 'text-gray-700 dark:text-zinc-300 font-medium',
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
      )}

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
              <h2 className="text-base font-semibold text-foreground">Project Information</h2>

              <AssamDistrictAutocomplete
                value={form.location}
                onChange={(v) => update('location', v)}
                error={step1ValidationAttempted ? step1Errors.location : undefined}
              />

              <Input
                label="Pincode"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 781001"
                value={form.pincode}
                onChange={(e) => update('pincode', formatPincodeInput(e.target.value))}
                error={step1ValidationAttempted ? step1Errors.pincode : undefined}
              />

              <Input
                label="Approximate built-up Area (Sqft)"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 1200"
                value={form.approximateArea}
                onChange={(e) => {
                  update('approximateArea', e.target.value);
                  setStep1Errors((prev) => ({ ...prev, builtUpArea: undefined }));
                }}
                error={step1ValidationAttempted ? step1Errors.builtUpArea : undefined}
              />
              <p className={HELPER_TEXT}>
                This built-up area is used as the slab area for every selected floor when Mistris quote their civil rate.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>House type</label>
                <div className="mt-1 grid grid-cols-2 gap-3">
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
                {step1ValidationAttempted && step1Errors.houseType && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {step1Errors.houseType}
                  </p>
                )}
              </div>

              {form.houseType === 'rcc' && (
                <div className="flex flex-col gap-1.5">
                  <label className={SECTION_LABEL}>Building / Floor Type</label>
                  <p className={HELPER_TEXT}>
                    Select only the RCC floors included in this project. Intermediate floors are not added automatically.
                  </p>
                  <BuildingTypeSelector
                    purpose="mistri"
                    rccOnly
                    allowNonSequentialFloors
                    value={form.buildingTypes}
                    onChange={setBuildingTypes}
                    showCustomFloor
                    customSelected={form.customFloorSelected}
                    customFloorNumber={form.customFloorNumber}
                    onCustomChange={setCustomFloor}
                    error={step1ValidationAttempted ? step1Errors.floors : null}
                    customError={step1ValidationAttempted ? step1Errors.customFloor : null}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>
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
                <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                  After bidding closes you have 5 minutes to select a mistri worker.
                </p>
              </div>

              <Button size="lg" className="w-full" onClick={tryGoStep2}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Work Requirements</h2>
                <p className="text-xs font-medium text-gray-700 dark:text-zinc-300 mt-1">
                  {form.buildingTypes.includes(ASSAM_BUILDING_TYPE)
                    ? 'Assam Type — Full finishing upto Plastering and Roof work is included. Choose roof truss, roofing sheet, flooring, and foundation depth.'
                    : 'Choose one Scope of Work for each selected floor. If a lower floor uses Option 1 or 2, upper floors can only use Option 1 or 2 — Option 3 is locked until the slab/frame is included.'}
                </p>
              </div>

              {step2Error && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{step2Error}</p>
                </div>
              )}

              {assembledFloorWork.map((fw) => {
                const key = floorWorkKey(fw.floorId, fw.customFloorNumber);
                const entry = form.floorWorkById[key] ?? EMPTY_FLOOR_WORK;
                const isAssam = isAssamMistriFloor(fw.floorId);
                const selectedScope = rccScopeFromWorkTypes(entry.workTypes);
                const structuralLocked = isUpperFloorStructuralScopeBlocked(
                  fw.floorId,
                  assembledFloorWork,
                  fw.customFloorNumber,
                );
                const wallLocked = isWallPlasterScopeBlocked(
                  fw.floorId,
                  assembledFloorWork,
                  fw.customFloorNumber,
                );
                const wallLockedByLowerStructure = isUpperFloorWallScopeBlocked(
                  fw.floorId,
                  assembledFloorWork,
                  fw.customFloorNumber,
                );
                const title = formatMistriFloorWorkLabel(fw);
                const theme = floorCardTheme(fw.floorId, fw.customFloorNumber);

                return (
                  <div
                    key={key}
                    className={cn(
                      'relative overflow-hidden rounded-2xl border p-4 pl-5 space-y-3 shadow-md',
                      theme.card,
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn('absolute inset-y-0 left-0 w-1.5 rounded-l-2xl', theme.bar)}
                    />
                    <div className="space-y-1.5">
                      <p
                        className={cn(
                          'inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide',
                          theme.badge,
                        )}
                      >
                        {title}
                      </p>
                      <p className={HELPER_TEXT}>
                        {isAssam
                          ? 'Full finishing upto Plastering and Roof work is included. Select roof truss, roofing sheet, flooring, and foundation depth.'
                          : 'Select one Scope of Work for this floor.'}
                      </p>
                    </div>

                    {isAssam ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">
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

                        <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
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

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                            Foundation depth (ft)
                          </label>
                          <Input
                            type="number"
                            min={0.1}
                            step="0.1"
                            inputMode="decimal"
                            placeholder="e.g. 4"
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
                      <div className="grid grid-cols-1 gap-2">
                        {MISTRI_RCC_SCOPE_OPTIONS.map((opt) => {
                          const selected = selectedScope === opt.value;
                          const structuralOptionLocked =
                            (opt.value === 'full_construction' || opt.value === 'frame_only') &&
                            structuralLocked;
                          const optionLocked =
                            opt.value === 'wall_plaster_only' && wallLocked;
                          const disabled = structuralOptionLocked || optionLocked;
                          return (
                            <div key={opt.value} className="space-y-2">
                              <OptionCardButton
                                selected={selected && !disabled}
                                disabled={disabled}
                                locked={disabled}
                                onClick={() =>
                                  setRccScope(fw.floorId, opt.value, fw.customFloorNumber)
                                }
                              >
                                <span className="block">
                                  <span className="block">
                                    Option {opt.optionNumber}: {opt.title}
                                  </span>
                                  <span className="mt-1 block text-[10px] font-medium leading-snug text-muted-foreground normal-case tracking-normal">
                                    {getMistriRccScopeLabel(fw.floorId, opt.value)}
                                  </span>
                                </span>
                              </OptionCardButton>
                              {structuralOptionLocked && (
                                <p className="px-1 text-[11px] font-medium text-red-700 dark:text-red-300">
                                  {UPPER_FLOOR_STRUCTURAL_REQUIRES_LOWER_FRAME}
                                </p>
                              )}
                              {optionLocked && (
                                <p className="px-1 text-[11px] font-medium text-red-700 dark:text-red-300">
                                  {wallLockedByLowerStructure
                                    ? UPPER_FLOOR_WALL_LOCKED_BY_LOWER_STRUCTURE
                                    : OPTION_3_REQUIRES_EXISTING_SLAB}
                                </p>
                              )}
                              {opt.value === 'full_construction' && selected && (
                                <div className="ml-2 space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-50/60 p-3 dark:bg-emerald-500/5">
                                  <label className="flex items-start gap-2 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                                      checked={entry.includeFineFlooring === true}
                                      onChange={(e) =>
                                        patchFloorWork(
                                          fw.floorId,
                                          {
                                            includeFineFlooring: e.target.checked,
                                            flooringMaterial: null,
                                            flooringAreaSqft: e.target.checked ? entry.flooringAreaSqft : '',
                                          },
                                          fw.customFloorNumber,
                                        )
                                      }
                                    />
                                    <span>Include Flooring Work?</span>
                                  </label>
                                  {entry.includeFineFlooring === true && (
                                    <>
                                    <NestedChoiceButtons
                                      question="Flooring material"
                                      options={MISTRI_FLOORING_MATERIAL_OPTIONS}
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
                              )}
                              {opt.value === 'wall_plaster_only' && selected && !optionLocked && (
                                <div className="ml-2 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                  <NestedChoiceButtons
                                    question="What type of wall material will be used?"
                                    options={MISTRI_BRICKWORK_MATERIAL_OPTIONS}
                                    value={entry.brickMaterial}
                                    onChange={(v) =>
                                      patchFloorWork(
                                        fw.floorId,
                                        { brickMaterial: v, plasterScope: 'both' },
                                        fw.customFloorNumber,
                                      )
                                    }
                                  />
                                  <WallAreaField
                                    value={entry.wallAreaSqft}
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {showFoundationProvision && (
                <div className="flex flex-col gap-3">
                  <div className={FORM_SECTION_CARD}>
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                      Foundation provision for
                    </p>
                    <Input
                      label="No. of floors"
                      type="text"
                      inputMode="numeric"
                      placeholder={`e.g. ${minFoundationFloors}`}
                      value={form.futureFloorCustom}
                      onChange={(e) => {
                        update('futureFloorCustom', e.target.value.replace(/\D/g, ''));
                        setStep2Error(null);
                      }}
                    />
                    <p className={HELPER_TEXT}>
                      Enter the number of floors the foundation must support. It must be greater
                      than your highest constructing floor.
                    </p>
                    {futureCustomError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {futureCustomError}
                      </p>
                    )}
                  </div>

                  <p className={cn(HELPER_TEXT, 'border-l-2 border-amber-500/50 pl-2.5')}>
                    * Note: Higher foundation provision needs stronger foundations, thicker columns,
                    and more steel today — this affects labor and material costs.
                  </p>
                </div>
              )}

              {showContractType && (
                <div className={FORM_SECTION_CARD}>
                  <label className={SECTION_LABEL}>
                    Contract Type (Work Scope)
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {MISTRI_CONTRACT_TYPE_OPTIONS.map((opt) => (
                      <OptionCardButton
                        key={opt.value}
                        selected={form.contractType === opt.value}
                        className={cn(
                          form.contractType === opt.value &&
                            'border-teal-600 bg-teal-50 text-teal-800 shadow-md ring-2 ring-teal-500/30 dark:border-teal-400 dark:bg-teal-500/15 dark:text-teal-200',
                        )}
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

              <div className="flex flex-col gap-2">
                <label className={SECTION_LABEL}>
                  Project Starting Time
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
                  <Input
                    label="Specific Start Date"
                    type="date"
                    value={form.projectStartTimeSpecificDate}
                    onChange={(e) => {
                      update('projectStartTimeSpecificDate', e.target.value);
                      setStep2Error(null);
                    }}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={SECTION_LABEL}>
                  Additional Requirements <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder=""
                  value={form.additionalRequirements}
                  onChange={(e) => {
                    update('additionalRequirements', e.target.value);
                    setStep2Error(null);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-slate-600 dark:placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                />
              </div>

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

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">Review & Launch Auction</h2>

              <div className="rounded-xl bg-secondary/50 border border-border divide-y divide-border">
                {[
                  { label: 'Project Title', value: previewTitle },
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
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="text-xs font-medium text-gray-700 dark:text-zinc-300 flex-1 min-w-0">{label}</span>
                    <div className="text-sm font-semibold text-foreground text-right flex-shrink-0 max-w-[55%]">
                      {value}
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

          {step === 4 && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Auction Launched! 🎉</h2>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
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
  );
}
