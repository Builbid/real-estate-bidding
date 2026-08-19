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
  className,
}: BidFloorRatesBreakdownProps) {
  const entries = getBidFloorRateEntries(rates, floorLabels);

  if (entries.length === 0) return null;

  return (
    <div className={cn('rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2', className)}>
      <div className="space-y-1">
        {entries.map(({ key, label, value }) => {
          const suffix = unitSuffixes?.[RATE_KEY_ORDER.indexOf(key)] ?? unitSuffix;
          return (
            <div key={key} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold tabular-nums text-foreground">
                ₹{value.toLocaleString('en-IN')}{suffix}
              </span>
            </div>
          );
        })}
      </div>
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
