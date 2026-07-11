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

const HEIGHT: Record<LogoSize, number> = {
  xs: 18,
  sm: 22,
  md: 28,
  lg: 34,
  xl: 44,
};

const WIDTH: Record<LogoSize, number> = {
  xs: 108,
  sm: 128,
  md: 156,
  lg: 188,
  xl: 228,
};

const MONO_SIZE: Record<LogoSize, number> = {
  xs: 24,
  sm: 28,
  md: 32,
  lg: 36,
  xl: 44,
};

function LogoDefs({ variant }: { variant: LogoVariant }) {
  const bidStart = variant === 'muted' ? '#8b5cf6' : '#7c3aed';
  const bidEnd = variant === 'muted' ? '#34d399' : '#10b981';

  return (
    <defs>
      <linearGradient id="bb-bid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={bidStart} />
        <stop offset="100%" stopColor={bidEnd} />
      </linearGradient>
      <linearGradient id="bb-mark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={variant === 'muted' ? '#7c3aed' : '#6d28d9'} />
        <stop offset="100%" stopColor={variant === 'muted' ? '#10b981' : '#059669'} />
      </linearGradient>
      <linearGradient id="bb-mono-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4c1d95" />
        <stop offset="55%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
  );
}

/** Abstract building frame + rising bid arrow */
function LogoMark({ variant }: { variant: LogoVariant }) {
  const stroke = variant === 'muted' ? '#e2e8f0' : '#ffffff';

  return (
    <g transform="translate(0, 2)">
      <rect x="0" y="0" width="26" height="26" rx="7" fill="url(#bb-mark-grad)" />
      <path
        d="M6.5 15.5 L13 9.5 L19.5 15.5"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <path
        d="M8.5 15.5 V19.5 M17.5 15.5 V19.5"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M8.5 19.5 H17.5"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M13 12.5 V17.5 M11.2 15.2 L13 17.5 L14.8 15.2"
        stroke="#a7f3d0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20.5" cy="6.5" r="2.2" fill="#34d399" />
      <circle cx="20.5" cy="6.5" r="3.6" stroke="#34d399" strokeWidth="0.8" opacity="0.45" />
    </g>
  );
}

function WordmarkSvg({
  height,
  width,
  variant,
  showAccent,
}: {
  height: number;
  width: number;
  variant: LogoVariant;
  showAccent: boolean;
}) {
  const builColor = variant === 'muted' ? '#64748b' : 'currentColor';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 156 32"
      width={width}
      height={height}
      fill="none"
      aria-hidden
      className="block shrink-0"
    >
      <LogoDefs variant={variant} />
      <LogoMark variant={variant} />

      <text
        x="34"
        y="21.5"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="19.5"
        fontWeight="600"
        letterSpacing="-0.045em"
        fill={builColor}
      >
        Buil
      </text>

      <circle cx="78" cy="16.5" r="2.4" fill="#10b981" opacity="0.9" />
      <circle cx="78" cy="16.5" r="4.2" stroke="#10b981" strokeWidth="0.9" opacity="0.28" />

      <text
        x="86"
        y="21.5"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="19.5"
        fontWeight="800"
        letterSpacing="-0.045em"
        fill="url(#bb-bid-grad)"
      >
        Bid
      </text>

      {showAccent && (
        <g opacity="0.95">
          <rect x="86" y="25" width="3" height="4" rx="1" fill="#7c3aed" opacity="0.55" />
          <rect x="91.5" y="23" width="3" height="6" rx="1" fill="#7c3aed" opacity="0.75" />
          <rect x="97" y="20.5" width="3" height="8.5" rx="1" fill="url(#bb-bid-grad)" />
          <path
            d="M86 27.5 H103.5"
            stroke="url(#bb-bid-grad)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.35"
          />
        </g>
      )}
    </svg>
  );
}

function MonogramSvg({
  size,
  variant,
}: {
  size: number;
  variant: LogoVariant;
}) {
  const letterColor = variant === 'muted' ? '#f8fafc' : '#ffffff';

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
      <LogoDefs variant={variant} />
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#bb-mono-grad)" />
      <path
        d="M7.5 14.5 L16 7.5 L24.5 14.5"
        stroke={letterColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <text
        x="8.5"
        y="22"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="14"
        fontWeight="700"
        letterSpacing="-0.08em"
        fill={letterColor}
        opacity="0.92"
      >
        B
      </text>
      <text
        x="17"
        y="22"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="14"
        fontWeight="900"
        letterSpacing="-0.08em"
        fill="#d9f99d"
      >
        B
      </text>
      <circle cx="24.5" cy="7.5" r="2.3" fill="#34d399" />
      <circle cx="24.5" cy="7.5" r="3.8" stroke="#6ee7b7" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
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
  if (compact) {
    return (
      <span className={cn('inline-flex items-center', className)}>
        <MonogramSvg size={MONO_SIZE[size]} variant={variant} />
      </span>
    );
  }

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <WordmarkSvg
        height={HEIGHT[size]}
        width={WIDTH[size]}
        variant={variant}
        showAccent={showAccent}
      />
      {showTagline && tagline && (
        <span className="mt-0.5 pl-[34px] text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {tagline}
        </span>
      )}
    </span>
  );
}
