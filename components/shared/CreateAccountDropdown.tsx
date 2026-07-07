'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';

const BIDDER_ROUTES = {
  labour_contractor: '/signup/bidder/labour-contractor',
  construction_firm: '/signup/bidder/construction-firm',
} as const;

interface CreateAccountDropdownMenuProps {
  onNavigate?: () => void;
  itemClassName?: string;
  signInClassName?: string;
  subItemClassName?: string;
}

export function CreateAccountDropdownMenu({
  onNavigate,
  itemClassName,
  signInClassName,
  subItemClassName,
}: CreateAccountDropdownMenuProps) {
  const { t } = useTranslation();
  const [bidderOpen, setBidderOpen] = useState(false);

  const itemClass = cn(
    'block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent transition-colors w-full text-left',
    itemClassName,
  );

  return (
    <>
      <Link href="/register?role=owner" onClick={onNavigate} className={itemClass}>
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
          <div className="ml-2 mt-0.5 mb-0.5 space-y-0.5 border-l border-border pl-2">
            <Link
              href={BIDDER_ROUTES.labour_contractor}
              onClick={onNavigate}
              className={cn(itemClass, 'text-xs font-medium', subItemClassName)}
            >
              {t('roles.labour_contractor')}
            </Link>
            <Link
              href={BIDDER_ROUTES.construction_firm}
              onClick={onNavigate}
              className={cn(itemClass, 'text-xs font-medium', subItemClassName)}
            >
              {t('roles.construction_firm')}
            </Link>
          </div>
        )}
      </div>

      <Link
        href="/login"
        onClick={onNavigate}
        className={cn(itemClass, 'text-muted-foreground', signInClassName)}
      >
        {t('common.signIn')}
      </Link>
    </>
  );
}

interface CreateAccountPopoverProps {
  compact?: boolean;
  triggerClassName?: string;
}

export function CreateAccountPopover({ compact, triggerClassName }: CreateAccountPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuKey, setMenuKey] = useState(0);

  function handleNavigate() {
    setOpen(false);
    setMenuKey((key) => key + 1);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setMenuKey((key) => key + 1);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className={cn(
            'h-8 rounded-full shadow-md shadow-emerald-500/20',
            compact ? 'px-3 text-xs' : 'px-4 text-sm',
            triggerClassName,
          )}
        >
          {t('common.createAccount')}
          {!compact && <ChevronDown className="w-3.5 h-3.5 opacity-80" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <CreateAccountDropdownMenu key={menuKey} onNavigate={handleNavigate} />
      </PopoverContent>
    </Popover>
  );
}
