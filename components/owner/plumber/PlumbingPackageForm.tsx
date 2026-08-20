'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { OptionSelectGrid } from '@/components/owner/wizard/OptionSelectCard';
import { StepperInput } from '@/components/owner/wizard/StepperInput';
import { WIZARD_SECTION_LABEL } from '@/components/owner/wizard/StartTimeAndNotes';
import {
  BATHROOM_PACKAGE_OPTIONS,
  BATHROOM_ROOM_SIZE_OPTIONS,
  PIPING_PACKAGE_OPTIONS,
  PLUMBING_TARGET_FLOOR_OPTIONS,
  formatBathroomPackageSelections,
  type BathroomPackage,
  type BathroomPackageSelection,
  type BathroomRoomSize,
  type PipingPackageKind,
  type PlumbingHouseStructure,
  type PlumbingTargetFloor,
} from '@/lib/tradeWorkDetails';
import { cn } from '@/lib/utils';

export function PlumbingPackageForm({
  bathroomPackages,
  pipingPackage,
  houseStructure,
  onChangeBathroomPackages,
  onChangePipingPackage,
}: {
  bathroomPackages: BathroomPackageSelection[];
  pipingPackage: PipingPackageKind | null;
  houseStructure: PlumbingHouseStructure | null;
  onChangeBathroomPackages: (value: BathroomPackageSelection[]) => void;
  onChangePipingPackage: (value: PipingPackageKind) => void;
}) {
  const [openCard, setOpenCard] = useState<'bathroom' | 'piping' | null>(null);
  const showFloorSelector = houseStructure === 'rcc';

  function updatePackage(pkg: BathroomPackage, patch: Partial<BathroomPackageSelection>) {
    onChangeBathroomPackages(
      bathroomPackages.map((item) => {
        if (item.package !== pkg) return item;
        const quantity = patch.quantity ?? item.quantity;
        const next: BathroomPackageSelection = {
          ...item,
          ...patch,
          quantity,
          size: quantity === 0 ? null : (patch.size ?? item.size),
        };
        if (quantity === 0) {
          next.targetFloor = null;
        } else if (houseStructure === 'assam_type') {
          next.targetFloor = 'ground';
        } else if (patch.targetFloor !== undefined) {
          next.targetFloor = patch.targetFloor;
        }
        return next;
      }),
    );
  }

  const bathroomSummary = formatBathroomPackageSelections(bathroomPackages);

  const pipingSummary = PIPING_PACKAGE_OPTIONS.find((o) => o.value === pipingPackage)?.label;

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
        Select one or more bathroom packages. Pipe diameters are included automatically.
        {showFloorSelector
          ? ' RCC buildings require a target floor on each package.'
          : houseStructure === 'assam_type'
            ? ' Assam Type houses default to Ground Floor.'
            : ''}
      </p>

      <ExpandableServiceCard
        title="Bathroom Package"
        subtitle={bathroomSummary || 'Tap to choose Common, Master, and Luxury packages'}
        open={openCard === 'bathroom'}
        onToggle={() => setOpenCard((current) => (current === 'bathroom' ? null : 'bathroom'))}
        selected={Boolean(bathroomSummary)}
      >
        <div className="space-y-3">
          {BATHROOM_PACKAGE_OPTIONS.map((pkg) => {
            const selection =
              bathroomPackages.find((item) => item.package === pkg.value) ?? {
                package: pkg.value,
                quantity: 0,
                size: null,
                targetFloor: null,
              };
            const active = selection.quantity > 0;
            return (
              <div
                key={pkg.value}
                className={cn(
                  'rounded-xl border p-3.5 space-y-3',
                  active
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border/70 bg-background/40',
                )}
              >
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{pkg.shortLabel}</p>
                  <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 mt-0.5">
                    {pkg.description}
                  </p>
                </div>
                <FixedScopeList
                  heading="Included fittings"
                  items={pkg.included}
                />
                <FixedScopeList
                  heading="Default pipe specifications"
                  items={pkg.pipeDefaults}
                />
                <StepperInput
                  label="Quantity"
                  value={selection.quantity}
                  onChange={(quantity) => updatePackage(pkg.value, { quantity })}
                  min={0}
                  max={6}
                  plusAtMax={false}
                />
                {active && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className={WIZARD_SECTION_LABEL}>Approximate Size (Sq. Ft.)</label>
                      <OptionSelectGrid
                        options={BATHROOM_ROOM_SIZE_OPTIONS}
                        value={selection.size}
                        onSelect={(size: BathroomRoomSize) => updatePackage(pkg.value, { size })}
                      />
                    </div>
                    {showFloorSelector && (
                      <div className="flex flex-col gap-1.5">
                        <label className={WIZARD_SECTION_LABEL}>Target Floor</label>
                        <OptionSelectGrid
                          options={PLUMBING_TARGET_FLOOR_OPTIONS}
                          value={selection.targetFloor}
                          onSelect={(targetFloor: PlumbingTargetFloor) =>
                            updatePackage(pkg.value, { targetFloor })
                          }
                          columns={2}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </ExpandableServiceCard>

      <ExpandableServiceCard
        title="Piping Package"
        subtitle={pipingSummary || 'Tap to choose open fitting or wall-cut fitting'}
        open={openCard === 'piping'}
        onToggle={() => setOpenCard((current) => (current === 'piping' ? null : 'piping'))}
        selected={Boolean(pipingPackage)}
      >
        <div className="space-y-3">
          {PIPING_PACKAGE_OPTIONS.map((pkg) => {
            const selected = pipingPackage === pkg.value;
            return (
              <button
                key={pkg.value}
                type="button"
                onClick={() => onChangePipingPackage(pkg.value)}
                aria-pressed={selected}
                className={cn(
                  'relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
                  selected
                    ? 'border-emerald-500/70 bg-emerald-500/10 shadow-md shadow-emerald-500/15'
                    : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
                )}
              >
                {selected && (
                  <CheckCircle2
                    className="absolute top-3 right-3 h-5 w-5 text-emerald-500 dark:text-emerald-400"
                    aria-hidden
                  />
                )}
                <p className="text-sm font-bold text-gray-900 dark:text-white pr-8">{pkg.label}</p>
                <p className="mt-1 text-xs font-medium text-gray-700 dark:text-zinc-300">
                  {pkg.description}
                </p>
                <ul className="mt-3 space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  {pkg.included.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs font-medium text-gray-800 dark:text-zinc-200"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <p className="text-xs font-medium leading-relaxed text-gray-800 dark:text-zinc-200">
              Toilet waste pipe stays non-concealing even on RCC buildings. Tap supply defaults to
              ¾ inch CPVC. Final settlement will be based on actual site measurement at agreed unit
              rates.
            </p>
          </div>
        </div>
      </ExpandableServiceCard>
    </div>
  );
}

function ExpandableServiceCard({
  title,
  subtitle,
  open,
  selected,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden',
        selected || open
          ? 'border-emerald-500/50 bg-secondary/10'
          : 'border-border bg-secondary/15',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
          <p className="mt-1 text-xs font-medium text-gray-600 dark:text-zinc-400">{subtitle}</p>
        </div>
        <ChevronDown
          className={cn(
            'mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/70 px-4 pb-4 pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FixedScopeList({ heading, items }: { heading: string; items: string[] }) {
  return (
    <ul className="space-y-1 rounded-lg border border-border/60 bg-background/50 p-2.5">
      <li className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        {heading}
      </li>
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-xs font-medium text-gray-800 dark:text-zinc-200"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
