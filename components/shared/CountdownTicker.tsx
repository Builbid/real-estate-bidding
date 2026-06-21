'use client';

import { useCountdown } from '@/lib/hooks/useCountdown';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2 } from 'lucide-react';

interface CountdownTickerProps {
  targetDateISO: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

function DigitBlock({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex gap-0.5">
        {str.split('').map((digit, i) => (
          <div
            key={i}
            className="w-7 h-9 flex items-center justify-center rounded-md bg-slate-800 border border-slate-700 font-mono text-lg font-bold text-white tabular-nums leading-none shadow-inner"
          >
            {digit}
          </div>
        ))}
      </div>
      <span className="text-[9px] uppercase tracking-widest text-slate-500 font-medium">{label}</span>
    </div>
  );
}

export function CountdownTicker({ targetDateISO, label, className, compact = false }: CountdownTickerProps) {
  const countdown = useCountdown(targetDateISO);

  if (countdown.isExpired) {
    return (
      <div className={cn('flex items-center gap-1.5 text-slate-400 text-xs', className)}>
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
        <Clock className={cn('w-3.5 h-3.5', isUrgent ? 'text-red-400 animate-pulse' : 'text-emerald-400')} />
        <span className={cn('font-mono text-sm font-semibold tabular-nums', isUrgent ? 'text-red-400' : 'text-emerald-400')}>
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
          <Clock className={cn('w-3.5 h-3.5', isUrgent ? 'text-red-400 animate-pulse' : 'text-emerald-400')} />
          <span className="text-xs text-slate-400 font-medium">{label}</span>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <DigitBlock value={countdown.hours}   label="HRS" />
        <span className="text-slate-600 font-mono text-xl mb-3.5">:</span>
        <DigitBlock value={countdown.minutes} label="MIN" />
        <span className="text-slate-600 font-mono text-xl mb-3.5">:</span>
        <DigitBlock value={countdown.seconds} label="SEC" />
      </div>
      {isUrgent && (
        <p className="text-xs text-red-400 animate-pulse font-medium">⚠ Closing soon</p>
      )}
    </div>
  );
}
