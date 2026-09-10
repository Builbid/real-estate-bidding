'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { NAV_BACK_LINK, NAV_PRESSABLE } from '@/lib/navStyles';
import { cn } from '@/lib/utils';

export function HistoryBackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cn(
        NAV_PRESSABLE,
        NAV_BACK_LINK,
        'justify-start text-left cursor-pointer border-0 bg-transparent',
        className,
      )}
    >
      <ArrowLeft className="w-4 h-4" aria-hidden />
      Back
    </button>
  );
}
