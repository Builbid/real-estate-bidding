'use client';

import { useRouter } from 'next/navigation';
import { CategoryServiceIcon } from '@/components/home/CategoryServiceIcons';
import { useOptionalPostProjectGuard } from '@/components/auth/PostProjectGuardProvider';
import { decidePostProjectAccess } from '@/lib/auth/roles';
import { getVisibleServiceCategories } from '@/lib/trades';
import type { ServiceType } from '@/lib/types';

interface ServiceCategoryBarProps {
  isAuthenticated: boolean;
  role: string | null;
}

/** Homepage service picker — fixed 3×2 grid on every viewport and zoom level. */
export function ServiceCategoryBar({ isAuthenticated, role }: ServiceCategoryBarProps) {
  const router = useRouter();
  const postGuard = useOptionalPostProjectGuard();
  const categories = getVisibleServiceCategories();

  function handleSelect(service: ServiceType) {
    const target = `/dashboard/owner/new-project?service=${service}`;
    const decision = decidePostProjectAccess(isAuthenticated, role);
    if (decision === 'blocked') {
      postGuard?.openBlockedDialog();
      return;
    }
    if (postGuard) {
      if (postGuard.requestPostProject(target)) {
        router.push(target);
      }
      return;
    }
    if (decision === 'login') {
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  }

  return (
    <div id="services" className="scroll-mt-20 bg-white dark:bg-transparent">
      <p className="mx-auto max-w-2xl text-center text-sm font-medium leading-snug text-slate-700 dark:text-slate-200 sm:text-base">
        Post your project and receive competitive bids from verified professionals.
      </p>

      <div className="mx-auto my-8 grid w-full max-w-4xl grid-cols-3 items-stretch justify-items-center gap-3 sm:gap-6">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleSelect(cat.value)}
            className="group flex h-full w-full cursor-pointer flex-col items-center gap-2 bg-transparent px-1 py-3 text-center sm:px-2 sm:py-4"
          >
            <span className="flex h-20 w-20 shrink-0 items-center justify-center bg-transparent transition-transform duration-200 ease-out group-hover:scale-110">
              <CategoryServiceIcon service={cat.value} />
            </span>
            <span className="w-full whitespace-nowrap text-center text-xs font-semibold leading-none text-slate-800 transition-transform duration-200 ease-out group-hover:scale-105 dark:text-slate-100 sm:text-sm">
              {cat.value === 'drawing_design' ? 'Drawing & Design' : cat.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
