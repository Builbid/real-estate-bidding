import { cn } from '@/lib/utils';
import type { FloorSummaryItem } from '@/lib/project/formatFloorSummary';

const BADGE_CLASS =
  'inline-flex max-w-full items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200';

export function FloorScopeBadges({
  items,
  className,
  badgeClassName,
}: {
  items: FloorSummaryItem[];
  className?: string;
  badgeClassName?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((item) => (
        <span
          key={item.key}
          title={item.label}
          className={cn(BADGE_CLASS, badgeClassName)}
        >
          <span className="truncate">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {item.floorCode}:
            </span>{' '}
            {item.scope}
          </span>
        </span>
      ))}
    </div>
  );
}
