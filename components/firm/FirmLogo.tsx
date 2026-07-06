import { cn } from '@/lib/utils';

interface FirmLogoProps {
  companyName: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

function getInitials(name: string | null | undefined): string {
  const safe = (name ?? '').trim();
  if (!safe) return 'CF';
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function FirmLogo({ companyName, logoUrl, size = 'md', className }: FirmLogoProps) {
  const sizeClass = SIZE_MAP[size];
  const displayName = companyName?.trim() || 'Construction Firm';

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={displayName}
        className={cn(
          'rounded-full object-cover border-2 border-violet-500/30 flex-shrink-0 bg-secondary',
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold flex-shrink-0',
        'bg-gradient-to-br from-violet-500 to-indigo-600 text-white border-2 border-violet-500/30',
        sizeClass,
        className,
      )}
      aria-hidden
    >
      {getInitials(displayName)}
    </div>
  );
}

export function getFirmCityLabel(firm?: {
  physical_address?: string | null;
  pincode?: string | null;
}): string | null {
  if (!firm?.physical_address) return null;
  const city = firm.physical_address.split(',')[0]?.trim();
  return city || firm.physical_address.trim();
}
