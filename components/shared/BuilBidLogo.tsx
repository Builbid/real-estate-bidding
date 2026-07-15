'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type LogoVariant = 'default' | 'muted';

interface BuilBidLogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  /** Icon-only monogram for tight spaces (e.g. mobile nav). */
  compact?: boolean;
  showAccent?: boolean;
  showTagline?: boolean;
  tagline?: string;
  className?: string;
}

/** Premium black & gold brand palette */
const GOLD = {
  deep: '#9a7312',
  classic: '#c9a227',
  bright: '#e8c547',
  highlight: '#f5de7a',
} as const;

const BLACK = {
  rich: '#0a0a0a',
  soft: '#171717',
  charcoal: '#262626',
} as const;

const MARK_SIZE: Record<LogoSize, number> = {
  xs: 22,
  sm: 26,
  md: 32,
  lg: 38,
  xl: 48,
};

const WORD_SIZE: Record<LogoSize, string> = {
  xs: 'text-[15px]',
  sm: 'text-[17px]',
  md: 'text-[21px]',
  lg: 'text-[25px]',
  xl: 'text-[32px]',
};

const ACCENT_HEIGHT: Record<LogoSize, number> = {
  xs: 10,
  sm: 11,
  md: 13,
  lg: 15,
  xl: 18,
};

function LogoDefs({ id, variant }: { id: string; variant: LogoVariant }) {
  const goldMid = variant === 'muted' ? '#a3842f' : GOLD.classic;
  const goldLight = variant === 'muted' ? '#c4a84a' : GOLD.bright;

  return (
    <defs>
      <linearGradient id={`${id}-mark`} x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={BLACK.rich} />
        <stop offset="55%" stopColor={BLACK.soft} />
        <stop offset="100%" stopColor={BLACK.charcoal} />
      </linearGradient>
      <linearGradient id={`${id}-gold`} x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={GOLD.deep} />
        <stop offset="50%" stopColor={goldMid} />
        <stop offset="100%" stopColor={goldLight} />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={GOLD.highlight} stopOpacity="0.22" />
        <stop offset="100%" stopColor={GOLD.highlight} stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

/** Black mark with gold construction details */
function LogoMark({
  size,
  variant,
  id,
}: {
  size: number;
  variant: LogoVariant;
  id: string;
}) {
  const slab = variant === 'muted' ? GOLD.classic : GOLD.bright;
  const arrow = variant === 'muted' ? GOLD.classic : GOLD.highlight;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className="block shrink-0"
    >
      <LogoDefs id={id} variant={variant} />
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${id}-mark)`} />
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        stroke={`url(#${id}-gold)`}
        strokeWidth="0.75"
        opacity="0.85"
      />
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${id}-shine)`} />

      {/* Floor slabs */}
      <rect x="6" y="19" width="14" height="2.2" rx="1" fill={slab} opacity="0.55" />
      <rect x="6" y="15" width="14" height="2.2" rx="1" fill={slab} opacity="0.78" />
      <rect x="6" y="11" width="14" height="2.2" rx="1" fill={slab} opacity="0.95" />

      {/* Rising bid arrow */}
      <path
        d="M19.5 21.5 V10.5 M19.5 10.5 L16.5 13.5 M19.5 10.5 L22.5 13.5"
        stroke={arrow}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Gold accent dot */}
      <circle cx="24.5" cy="7.5" r="2.1" fill={GOLD.bright} />
      <circle cx="24.5" cy="7.5" r="3.4" stroke={GOLD.highlight} strokeWidth="0.9" opacity="0.5" />
    </svg>
  );
}

function BidAccentBars({ height, variant }: { height: number; variant: LogoVariant }) {
  const c1 = variant === 'muted' ? '#a3842f' : GOLD.deep;
  const c2 = variant === 'muted' ? '#c9a227' : GOLD.classic;
  const c3 = variant === 'muted' ? '#e0bc4a' : GOLD.bright;
  const line = variant === 'muted' ? '#c9a22766' : '#c9a22755';

  return (
    <svg
      width={height * 1.35}
      height={height}
      viewBox="0 0 18 13"
      fill="none"
      aria-hidden
      className="shrink-0 opacity-90"
    >
      <rect x="0" y="9" width="3" height="4" rx="1" fill={c1} opacity="0.55" />
      <rect x="5" y="6" width="3" height="7" rx="1" fill={c2} opacity="0.78" />
      <rect x="10" y="2" width="3" height="11" rx="1" fill={c3} />
      <path d="M0 12.5 H16" stroke={line} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function MonogramSvg({
  size,
  variant,
  id,
}: {
  size: number;
  variant: LogoVariant;
  id: string;
}) {
  return <LogoMark size={size} variant={variant} id={id} />;
}

export function BuilBidLogo({
  size = 'md',
  variant = 'default',
  compact = false,
  showAccent = true,
  showTagline = false,
  tagline,
  className,
}: BuilBidLogoProps) {
  const uid = useId().replace(/:/g, '');
  const markId = compact ? `${uid}-mono` : `${uid}-word`;
  const builClass =
    variant === 'muted'
      ? 'text-neutral-600 dark:text-neutral-400'
      : 'text-neutral-950 dark:text-neutral-100';
  const bidClass =
    variant === 'muted'
      ? 'text-[#a3842f] dark:text-[#d4b84a]'
      : 'text-[#b8860b] dark:text-[#e8c547]';

  if (compact) {
    return (
      <span className={cn('inline-flex items-center', className)}>
        <MonogramSvg size={MARK_SIZE[size]} variant={variant} id={`${uid}-mono`} />
      </span>
    );
  }

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className="inline-flex items-center gap-2 sm:gap-2.5">
        <LogoMark size={MARK_SIZE[size]} variant={variant} id={markId} />

        <span
          className={cn(
            'inline-flex items-baseline font-bold leading-none tracking-tight',
            WORD_SIZE[size],
          )}
        >
          <span className={cn('font-semibold', builClass)}>Buil</span>
          <span className={cn('relative font-extrabold', bidClass)}>
            Bid
            <span
              className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full opacity-90 bg-gradient-to-r from-[#9a7312] via-[#d4af37] to-[#f5de7a]"
              aria-hidden
            />
          </span>
        </span>

        {showAccent && (
          <BidAccentBars height={ACCENT_HEIGHT[size]} variant={variant} />
        )}
      </span>

      {showTagline && tagline && (
        <span className="mt-1 pl-[calc(var(--bb-mark,2rem)+0.5rem)] text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {tagline}
        </span>
      )}
    </span>
  );
}
