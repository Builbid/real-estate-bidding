import { cn } from '@/lib/utils';

const VALUE_TONE = {
  live: 'text-emerald-600 dark:text-emerald-400',
  select: 'text-amber-600 dark:text-amber-400',
  done: 'text-foreground',
  neutral: 'text-foreground',
} as const;

const CARD_TONE = {
  live: 'border-emerald-500/25 bg-emerald-500/[0.06]',
  select: 'border-amber-500/30 bg-amber-500/[0.07]',
  done: 'border-border bg-muted/50',
  neutral: 'border-border bg-card',
} as const;

export function DashboardStatTiles({
  items,
  variant = 'cards',
}: {
  items: {
    label: string;
    value: number;
    hint?: string;
    tone?: 'live' | 'select' | 'done' | 'neutral';
  }[];
  variant?: 'cards' | 'plain';
}) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
      {items.map(({ label, value, hint, tone = 'neutral' }) => (
        <div
          key={label}
          className={cn(
            'min-w-0',
            variant === 'cards' && `rounded-xl border px-4 py-3 ${CARD_TONE[tone]}`,
          )}
        >
          <p
            className={cn(
              'tabular-nums tracking-tight text-foreground',
              variant === 'plain' ? 'text-3xl font-extrabold sm:text-4xl' : 'text-2xl font-bold',
              variant === 'plain' && VALUE_TONE[tone],
            )}
          >
            {value}
          </p>
          <p
            className={cn(
              'text-foreground',
              variant === 'plain' ? 'mt-1 text-sm font-semibold' : 'mt-0.5 text-xs font-medium',
            )}
          >
            {label}
          </p>
          {hint ? (
            <p
              className={cn(
                'text-muted-foreground',
                variant === 'plain' ? 'mt-0.5 text-xs' : 'mt-0.5 text-[11px]',
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
