'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';

interface MobileGuestAuthMenuProps {
  onNavigate: () => void;
}

export function MobileGuestAuthMenu({ onNavigate }: MobileGuestAuthMenuProps) {
  const { t } = useTranslation();
  const [bidderOpen, setBidderOpen] = useState(false);

  const itemClass =
    'block w-full rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-accent transition-colors text-left';

  return (
    <>
      <Link href="/signup/project-owner" onClick={onNavigate} className={itemClass}>
        {t('home.hero.startPosting')}
      </Link>

      <div>
        <button
          type="button"
          onClick={() => setBidderOpen((open) => !open)}
          aria-expanded={bidderOpen}
          className={cn(itemClass, 'flex items-center justify-between gap-2')}
        >
          <span>{t('home.hero.imBuilder')}</span>
          <ChevronDown
            className={cn('h-4 w-4 flex-shrink-0 opacity-70 transition-transform', bidderOpen && 'rotate-180')}
          />
        </button>
        {bidderOpen && (
          <div className="ml-2 mt-0.5 space-y-0.5 border-l border-border pl-2">
            <Link
              href="/signup/bidder/labour-contractor"
              onClick={onNavigate}
              className={cn(itemClass, 'text-xs font-medium')}
            >
              {t('roles.labour_contractor')}
            </Link>
            <Link
              href="/signup/bidder/construction-firm"
              onClick={onNavigate}
              className={cn(itemClass, 'text-xs font-medium')}
            >
              {t('roles.construction_firm')}
            </Link>
          </div>
        )}
      </div>

      <Link href="/login" onClick={onNavigate} className={itemClass}>
        {t('common.signIn')}
      </Link>
    </>
  );
}
