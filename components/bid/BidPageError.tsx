'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BidPageErrorProps {
  dashboardHref: string;
  dashboardLabel?: string;
}

export function BidPageError({
  dashboardHref,
  dashboardLabel = 'Back to Dashboard',
}: BidPageErrorProps) {
  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <div>
          <h1 className="text-lg font-bold text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong loading this bid page. Please try again.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
          <Button asChild>
            <Link href={dashboardHref}>
              <ArrowLeft className="w-4 h-4" /> {dashboardLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
