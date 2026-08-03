import { cn } from '@/lib/utils';
import { getBidFloorRateEntries } from '@/lib/bid/floorRateDisplay';
import type { BidRates } from '@/lib/types';

interface BidFloorRatesBreakdownProps {
  rates: Partial<BidRates> | null | undefined;
  total?: number;
  /** When true, includes a total row (use when floor rows are shown without a separate total). */
  showTotal?: boolean;
  className?: string;
}

export function BidFloorRatesBreakdown({
  rates,
  total,
  showTotal = false,
  className,
}: BidFloorRatesBreakdownProps) {
  const entries = getBidFloorRateEntries(rates);

  if (entries.length === 0) return null;
  if (entries.length === 1 && !showTotal) return null;

  return (
    <div className={cn('rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2', className)}>
      <div className="space-y-1">
        {entries.map(({ key, label, value }) => (
          <div key={key} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold tabular-nums text-foreground">
              ₹{value.toLocaleString('en-IN')}/sqft
            </span>
          </div>
        ))}
      </div>
      {showTotal && total != null && (
        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-border/50 pt-1.5 text-[11px]">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            ₹{total.toLocaleString('en-IN')}/sqft
          </span>
        </div>
      )}
    </div>
  );
}
