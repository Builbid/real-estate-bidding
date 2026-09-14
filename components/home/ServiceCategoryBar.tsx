'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  DraftingCompass,
  HardHat,
  Palette,
  Shovel,
  Wrench,
  Zap,
} from 'lucide-react';
import { getVisibleServiceCategories } from '@/lib/trades';
import { cn } from '@/lib/utils';
import type { ServiceType } from '@/lib/types';

interface ServiceCategoryBarProps {
  isAuthenticated: boolean;
  role: string | null;
}

const CATEGORY_ICONS: Record<ServiceType, LucideIcon> = {
  labour_contractor: HardHat,
  construction_firm: Building2,
  drawing_design: DraftingCompass,
  painter: Palette,
  plumber: Wrench,
  electrician: Zap,
  earthwork: Shovel,
  carpenter: HardHat,
  false_ceiling_work: Palette,
};

/** Homepage service picker — sized for the active category count (no Interior Work). */
export function ServiceCategoryBar({ isAuthenticated, role }: ServiceCategoryBarProps) {
  const router = useRouter();
  const isOwner = role === 'owner';
  const categories = getVisibleServiceCategories();
  const count = categories.length;

  function handleSelect(service: ServiceType) {
    const target = `/dashboard/owner/new-project?service=${service}`;
    if (!isAuthenticated || !isOwner) {
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  }

  return (
    <div className="bg-white dark:bg-transparent">
      <p className="mx-auto max-w-2xl text-center text-sm font-medium leading-snug text-slate-700 dark:text-slate-200 sm:text-base">
        Post your project and receive competitive bids from verified professionals.
      </p>

      <div
        className={cn(
          'mx-auto my-8 grid w-full items-stretch justify-items-center gap-3 sm:gap-4',
          count <= 6
            ? 'max-w-5xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
            : count === 7
              ? 'max-w-6xl grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
              : 'max-w-6xl grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
        )}
      >
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.value] ?? HardHat;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleSelect(cat.value)}
              className="group flex h-full w-full max-w-[9.5rem] cursor-pointer flex-col items-center gap-2 rounded-xl bg-white p-4 text-center transition-all duration-200 hover:bg-slate-50 dark:bg-transparent dark:hover:bg-slate-800/60 sm:max-w-none"
            >
              <span className="flex h-16 w-16 shrink-0 items-center justify-center bg-transparent sm:h-[4.5rem] sm:w-[4.5rem]">
                <Icon
                  className="h-9 w-9 text-slate-700 transition-transform duration-200 group-hover:scale-110 group-hover:text-emerald-700 dark:text-slate-200 dark:group-hover:text-emerald-400 sm:h-10 sm:w-10"
                  strokeWidth={1.6}
                  aria-hidden
                />
              </span>
              <span className="line-clamp-2 min-h-[2.5em] px-1 text-xs font-semibold leading-snug text-slate-800 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400 sm:text-sm">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
