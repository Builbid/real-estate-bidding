'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';

interface CreateAccountButtonProps {
  compact?: boolean;
  className?: string;
}

export function CreateAccountButton({ compact, className }: CreateAccountButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      size="sm"
      asChild
        className={cn(
        'h-8 rounded-full btn-glow-emerald',
        compact ? 'px-3 text-xs' : 'px-4 text-sm',
        className,
      )}
    >
      <Link href="/signup" prefetch>{t('common.createAccount')}</Link>
    </Button>
  );
}
