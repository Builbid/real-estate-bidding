'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shown instead of a blank screen when an owner page fails to load. */
export default function OwnerDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <AlertCircle className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="mb-1 text-sm font-semibold text-foreground">Couldn&apos;t load your dashboard</p>
        <p className="text-xs text-muted-foreground">
          {error.message || 'Something went wrong. Please try again.'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go to home</Link>
        </Button>
      </div>
    </div>
  );
}
