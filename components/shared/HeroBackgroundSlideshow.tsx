'use client';

export function HeroBackgroundSlideshow() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 min-h-full w-full overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50/80 dark:from-slate-950 dark:via-background dark:to-emerald-950/30" />
      <div
        className="absolute -top-24 right-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl dark:opacity-25"
        style={{ background: 'radial-gradient(circle, hsl(160 84% 39% / 0.35) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full opacity-30 blur-3xl dark:opacity-20"
        style={{ background: 'radial-gradient(circle, hsl(262 83% 58% / 0.2) 0%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}
