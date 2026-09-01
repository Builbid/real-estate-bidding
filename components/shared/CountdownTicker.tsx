'use client';

import { useEffect, useRef } from 'react';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2 } from 'lucide-react';

interface CountdownTickerProps {
  targetDateISO: string;
  label?: string;
  className?: string;
  compact?: boolean;
  onExpire?: () => void;  // fired once when the timer hits zero
}

function DigitBlock({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex gap-0.5">
        {str.split('').map((digit, i) => (
          <div
            key={i}
            className="w-7 h-9 flex items-center justify-center rounded-md bg-secondary border border-border font-mono text-lg font-bold text-foreground tabular-nums leading-none shadow-inner"
          >
            {digit}
          </div>
        ))}
      </div>
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export function CountdownTicker({ targetDateISO, label, className, compact = false, onExpire }: CountdownTickerProps) {
  const countdown   = useCountdown(targetDateISO);
  const firedRef    = useRef(false);

  // Fire onExpire exactly once when the timer transitions to expired
  useEffect(() => {
    if (countdown.isExpired && !firedRef.current && onExpire) {
      firedRef.current = true;
      onExpire();
    }
  }, [countdown.isExpired, onExpire]);

  if (countdown.isExpired) {
    // In compact mode (dashboard rows) show nothing — onExpire already triggers a page refresh
    if (compact) return null;
    return (
      <div className={cn('flex items-center gap-1.5 text-muted-foreground text-xs', className)}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span className="font-medium">Bidding Closed</span>
      </div>
    );
  }

  if (compact) {
    const { hours, minutes, seconds } = countdown;
    const formatted = [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
    const isUrgent = hours === 0 && minutes < 30;
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Clock className={cn('w-3.5 h-3.5', isUrgent ? 'text-red-600 animate-pulse dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')} />
        <span className={cn('font-mono text-sm font-bold tabular-nums', isUrgent ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')}>
          {formatted}
        </span>
      </div>
    );
  }

  const isUrgent = countdown.hours === 0 && countdown.minutes < 30;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <div className="flex items-center gap-1.5">
          <Clock className={cn('w-3.5 h-3.5', isUrgent ? 'text-red-600 animate-pulse dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400')} />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <DigitBlock value={countdown.hours}   label="HRS" />
        <span className="text-muted-foreground font-mono text-xl mb-3.5">:</span>
        <DigitBlock value={countdown.minutes} label="MIN" />
        <span className="text-muted-foreground font-mono text-xl mb-3.5">:</span>
        <DigitBlock value={countdown.seconds} label="SEC" />
      </div>
      {isUrgent && (
        <p className="text-xs text-red-400 animate-pulse font-medium">⚠ Closing soon</p>
      )}
    </div>
  );
}
