import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  compact?: boolean;
}

export function VerifiedBadge({ className, compact }: VerifiedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        className,
      )}
    >
      <BadgeCheck className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      Verified
    </span>
  );
}
