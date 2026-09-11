'use client';

import { useRouter } from 'next/navigation';
import { getVisibleServiceCategories } from '@/lib/trades';
import { cn } from '@/lib/utils';
import type { ServiceType } from '@/lib/types';

interface ServiceCategoryBarProps {
  isAuthenticated: boolean;
  role: string | null;
}

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
    <div>
      <p className="mx-auto max-w-2xl text-center text-sm font-medium leading-snug text-slate-700 dark:text-slate-200 sm:text-base">
        Post your project and receive competitive bids from verified professionals.
      </p>

      <div
        className={cn(
          'mx-auto mt-5 grid w-full items-stretch justify-items-center gap-3 sm:mt-6 sm:gap-4',
          count <= 6
            ? 'max-w-5xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
            : count === 7
              ? 'max-w-6xl grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
              : 'max-w-6xl grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
        )}
      >
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleSelect(cat.value)}
            className="group flex h-full w-full max-w-[9.5rem] flex-col items-center gap-2 text-center sm:max-w-none"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center leading-none sm:h-[4.5rem] sm:w-[4.5rem]">
              <span className="text-3xl transition-transform duration-200 group-hover:scale-110 sm:text-4xl">
                {cat.emoji}
              </span>
            </span>
            <span className="line-clamp-2 min-h-[2.5em] px-1 text-xs font-semibold leading-snug text-slate-800 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400 sm:text-sm">
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
