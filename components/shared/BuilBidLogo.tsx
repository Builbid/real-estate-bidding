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
  xs: 16,
  sm: 20,
  md: 26,
  lg: 32,
  xl: 40,
};

const WIDTH: Record<LogoSize, number> = {
  xs: 72,
  sm: 88,
  md: 112,
  lg: 136,
  xl: 168,
};

const MONO_SIZE: Record<LogoSize, number> = {
  xs: 22,
  sm: 26,
  md: 30,
  lg: 34,
  xl: 40,
};

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
  const bidColor = variant === 'muted' ? '#8b5cf6' : '#7c3aed';
  const accentColor = '#10b981';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 112 28"
      width={width}
      height={height}
      fill="none"
      aria-hidden
      className="block shrink-0"
    >
      <text
        x="0"
        y="21"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="20"
        fontWeight="600"
        letterSpacing="-0.04em"
        fill={builColor}
      >
        Buil
      </text>
      <text
        x="46"
        y="21"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="20"
        fontWeight="700"
        letterSpacing="-0.04em"
        fill={bidColor}
      >
        Bid
      </text>
      {showAccent && (
        <path
          d="M46 25.5 L54.5 25.5 L58.5 22.5 L66 25.5 L74.5 25.5"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
  const bidColor = variant === 'muted' ? '#8b5cf6' : '#7c3aed';
  const builColor = variant === 'muted' ? '#64748b' : 'currentColor';

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
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        fill="rgba(124,58,237,0.08)"
        stroke="rgba(124,58,237,0.22)"
        strokeWidth="1"
      />
      <text
        x="9"
        y="21.5"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="-0.06em"
        fill={builColor}
      >
        B
      </text>
      <text
        x="17.5"
        y="21.5"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
        fontWeight="800"
        letterSpacing="-0.06em"
        fill={bidColor}
      >
        B
      </text>
      <circle cx="25" cy="8" r="2.5" fill="#10b981" />
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
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {tagline}
        </span>
      )}
    </span>
  );
}
