import { cn } from '@/lib/utils';
import { getBidFloorRateEntries } from '@/lib/bid/floorRateDisplay';
import type { BidRates } from '@/lib/types';

interface BidFloorRatesBreakdownProps {
  rates: Partial<BidRates> | null | undefined;
  total?: number;
  /** When true, includes a total row (use when floor rows are shown without a separate total). */
  showTotal?: boolean;
  /** Project-selected floor names, aligned to ground/first/second rate keys. */
  floorLabels?: string[];
  /** Unit shown after each rate. Defaults to /sqft. */
  unitSuffix?: string;
  /** Per-rate unit suffixes aligned with ground/first/second/third rate keys. */
  unitSuffixes?: Array<string | undefined>;
  extraEntries?: Array<{ label: string; value: number; suffix?: string }>;
  indexLabel?: string;
  indexValue?: number;
  /** Informational plumber running-foot rate. Shown separately and never added to totals. */
  runningFootRate?: number | null;
  /** Informational Mistri tile fitting rate. Shown separately and never added to totals. */
  tileFittingRate?: number | null;
  className?: string;
}

const RATE_KEY_ORDER = ['ground_rate', 'first_rate', 'second_rate', 'third_rate'] as const;

export function BidFloorRatesBreakdown({
  rates,
  total,
  showTotal = false,
  floorLabels,
  unitSuffix = '/sqft',
  unitSuffixes,
  extraEntries,
  indexLabel,
  indexValue,
  runningFootRate,
  tileFittingRate,
  className,
}: BidFloorRatesBreakdownProps) {
  const floorEntries = extraEntries?.length
    ? extraEntries.map((entry, index) => ({
        key: `extra-${index}`,
        label: entry.label,
        value: entry.value,
        suffix: entry.suffix ?? unitSuffix,
      }))
    : getBidFloorRateEntries(rates, floorLabels).map((entry) => ({
        ...entry,
        suffix: unitSuffixes?.[RATE_KEY_ORDER.indexOf(entry.key)] ?? unitSuffix,
      }));

  if (
    floorEntries.length === 0 &&
    indexValue == null &&
    !(runningFootRate != null && runningFootRate > 0) &&
    !(tileFittingRate != null && tileFittingRate > 0)
  ) {
    return null;
  }

  return (
    <div className={cn('rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2', className)}>
      <div className="space-y-1">
        {floorEntries.map((entry) => (
            <div key={entry.key} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-semibold tabular-nums text-foreground">
                ₹{entry.value.toLocaleString('en-IN')}{entry.suffix}
              </span>
            </div>
        ))}
      </div>
      {indexValue != null && (
        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-border/50 pt-1.5 text-[11px]">
          <span className="font-medium text-foreground">{indexLabel ?? 'Weighted Index'}</span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            ₹{indexValue.toLocaleString('en-IN')}
          </span>
        </div>
      )}
      {runningFootRate != null && runningFootRate > 0 && (
        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-dashed border-amber-500/40 pt-1.5 text-[11px]">
          <span className="font-medium text-amber-800 dark:text-amber-300">Rate per Linear Running Foot</span>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-bold tabular-nums text-amber-800 dark:text-amber-300">
            ₹{runningFootRate.toLocaleString('en-IN')}/ft
          </span>
        </div>
      )}
      {tileFittingRate != null && tileFittingRate > 0 && (
        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-dashed border-amber-500/40 pt-1.5 text-[11px]">
          <span className="font-medium text-amber-800 dark:text-amber-300">Tile Fitting Rate</span>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-bold tabular-nums text-amber-800 dark:text-amber-300">
            ₹{tileFittingRate.toLocaleString('en-IN')}/sqft floor
          </span>
        </div>
      )}
      {showTotal && total != null && (
        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-border/50 pt-1.5 text-[11px]">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            ₹{total.toLocaleString('en-IN')}{unitSuffix}
          </span>
        </div>
      )}
    </div>
  );
}
