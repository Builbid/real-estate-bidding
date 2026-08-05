'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { selectBuilderAction } from '@/app/actions/select';
import { Button } from '@/components/ui/button';
import { PackageInfoButton } from '@/components/firm/PackageInfoButton';
import type { PackageBidPrice } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  firmId: string;
  companyName?: string;
  /** The firm's per-package bid prices — the owner must pick exactly one when awarding. */
  packageRates?: PackageBidPrice[];
}

export function SelectFirmButton({ projectId, firmId, companyName, packageRates = [] }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [packageId, setPackageId] = useState<string | null>(
    packageRates.length === 1 ? packageRates[0].package.id : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = companyName ?? 'this firm';
  const hasPackages = packageRates.length > 0;

  async function handleConfirm() {
    if (hasPackages && !packageId) {
      setError('Choose a package before confirming.');
      return;
    }
    setLoading(true);
    setError(null);

    const result = await selectBuilderAction(projectId, firmId, companyName, packageId ?? undefined);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  function handleCancel() {
    setOpen(false);
    setError(null);
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="bg-violet-600 hover:bg-violet-500">
        <UserCheck className="w-3.5 h-3.5" /> Select This Firm
      </Button>
    );
  }

  return (
    <div className="w-full max-w-full sm:w-80 rounded-lg border border-violet-500/30 bg-secondary/40 p-3 space-y-2.5">
      <p className="text-xs font-semibold text-foreground">
        {hasPackages ? `Choose a package from ${label}` : `Select ${label}?`}
      </p>

      {hasPackages ? (
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {packageRates.map((entry) => (
            <label
              key={entry.package.id}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 rounded-md border cursor-pointer text-xs transition-colors',
                packageId === entry.package.id
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-border bg-card/60 hover:border-violet-500/30',
              )}
            >
              <input
                type="radio"
                name={`select-package-${firmId}`}
                checked={packageId === entry.package.id}
                onChange={() => setPackageId(entry.package.id)}
                className="accent-violet-500 flex-shrink-0"
              />
              <span className="flex-1 font-medium text-foreground truncate">{entry.package.name}</span>
              <span className="font-bold text-foreground whitespace-nowrap">
                ₹{entry.rate.toLocaleString('en-IN')}/sqft
              </span>
              <PackageInfoButton pkg={entry.package} />
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          BuilBid will coordinate next steps once you confirm.
        </p>
      )}

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      <div className="flex gap-2 pt-0.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs bg-violet-600 hover:bg-violet-500"
          onClick={handleConfirm}
          disabled={loading || (hasPackages && !packageId)}
        >
          {loading ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            'Confirm Selection'
          )}
        </Button>
      </div>
    </div>
  );
}
