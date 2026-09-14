export function DashboardStatTiles({
  items,
}: {
  items: {
    label: string;
    value: number;
    hint?: string;
    tone?: 'live' | 'select' | 'done' | 'neutral';
  }[];
}) {
  const toneClass = {
    live: 'border-emerald-500/25 bg-emerald-500/[0.06]',
    select: 'border-amber-500/30 bg-amber-500/[0.07]',
    done: 'border-border bg-muted/50',
    neutral: 'border-border bg-card',
  } as const;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, hint, tone = 'neutral' }) => (
        <div
          key={label}
          className={`rounded-xl border px-4 py-3 ${toneClass[tone]}`}
        >
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="mt-0.5 text-xs font-medium text-foreground">{label}</p>
          {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
