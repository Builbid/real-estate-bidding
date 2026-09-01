'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  MAX_PACKAGES,
  MIN_CATEGORY_LENGTH,
  PACKAGE_CATEGORIES,
  createEmptyPackage,
} from '@/lib/firm/constructionClass';
import type { FirmConstructionPackage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FirmConstructionClassPackagesFormProps {
  value: FirmConstructionPackage[];
  onChange: (packages: FirmConstructionPackage[]) => void;
  errors?: Record<string, string | null>;
  onBlur?: (packageId: string, field: string) => void;
}

export function FirmConstructionClassPackagesForm({
  value,
  onChange,
  errors = {},
  onBlur,
}: FirmConstructionClassPackagesFormProps) {
  function updatePackage(id: string, patch: Partial<FirmConstructionPackage>) {
    onChange(value.map((pkg) => (pkg.id === id ? { ...pkg, ...patch } : pkg)));
  }

  function addPackage() {
    if (value.length >= MAX_PACKAGES) return;
    onChange([...value, createEmptyPackage(`Package ${value.length + 1}`)]);
  }

  function removePackage(id: string) {
    if (value.length <= 1) return;
    onChange(value.filter((pkg) => pkg.id !== id));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Define your construction packages *
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Create and name as many packages as you offer (e.g. Class A / B / C, or your own names
          like &quot;Elite&quot; or &quot;Budget Plus&quot;). Describe exactly what&apos;s included
          in each so clients can compare your offerings.
        </p>
      </div>

      <div className="space-y-5">
        {value.map((pkg, index) => {
          const nameError = errors[`${pkg.id}.name`];

          return (
            <div
              key={pkg.id}
              className="rounded-xl border-2 border-border bg-secondary/20 p-4 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <label htmlFor={`${pkg.id}-name`} className="sr-only">
                    Package name
                  </label>
                  <input
                    id={`${pkg.id}-name`}
                    type="text"
                    value={pkg.name}
                    onChange={(e) => updatePackage(pkg.id, { name: e.target.value })}
                    onBlur={() => onBlur?.(pkg.id, 'name')}
                    placeholder={`e.g. Class ${String.fromCharCode(65 + index)}`}
                    className={cn(
                      'w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm font-bold text-foreground placeholder:text-muted-foreground placeholder:font-normal',
                      'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-emerald-500/70 dark:bg-card/60',
                      nameError && 'border-red-500/70 focus:ring-red-500/40',
                    )}
                  />
                  {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
                </div>
                {value.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(pkg.id)}
                    className="shrink-0 mt-1 p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label={`Remove ${pkg.name || 'package'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PACKAGE_CATEGORIES.map((category) => {
                  const fieldKey = `${pkg.id}.${category.key}`;
                  const text = pkg[category.key] ?? '';
                  const error = errors[fieldKey];
                  const tooShort = text.length > 0 && text.length < MIN_CATEGORY_LENGTH;

                  return (
                    <div key={category.key} className="space-y-1">
                      <label
                        htmlFor={fieldKey}
                        className="text-xs font-semibold text-foreground"
                      >
                        {category.label}
                      </label>
                      <textarea
                        id={fieldKey}
                        rows={3}
                        value={text}
                        onChange={(e) => updatePackage(pkg.id, { [category.key]: e.target.value })}
                        onBlur={() => onBlur?.(pkg.id, category.key)}
                        placeholder={category.hint}
                        className={cn(
                          'flex w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground shadow-sm',
                          'ring-offset-background transition-all duration-150 resize-y min-h-[76px]',
                          'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-emerald-500/70',
                          'dark:bg-card/60',
                          (error || tooShort) && 'border-red-500/70 focus:ring-red-500/40',
                        )}
                      />
                      {error && <p className="text-[11px] text-red-400">{error}</p>}
                      {!error && tooShort && (
                        <p className="text-[11px] text-red-400">
                          Add at least {MIN_CATEGORY_LENGTH} characters.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addPackage}
        disabled={value.length >= MAX_PACKAGES}
      >
        <Plus className="w-3.5 h-3.5" /> Add Another Package
      </Button>
    </div>
  );
}
