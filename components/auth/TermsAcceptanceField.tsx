'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RoleTermsDocumentView } from '@/components/legal/RoleTermsDocumentView';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ROLE_TERMS, type RoleTermsAudience } from '@/lib/legal/roleTerms';

export function TermsAcceptanceField({
  audience,
  checked,
  onCheckedChange,
}: {
  audience: RoleTermsAudience;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const doc = ROLE_TERMS[audience];
  const inputId = `accept-terms-${audience}`;

  return (
    <div className="pt-1">
      <label htmlFor={inputId} className="flex items-start gap-3 cursor-pointer">
        <input
          id={inputId}
          name="accepted_terms"
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-emerald-600"
        />
        <span className="text-sm leading-relaxed text-muted-foreground">
          I agree to the{' '}
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(true);
            }}
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            {doc.termsLinkLabel}
          </button>{' '}
          and{' '}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Privacy Policy
          </Link>.
        </span>
      </label>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(85vh,40rem)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="mb-0 shrink-0 border-b border-border/60 px-6 pb-4 pr-12 pt-6">
            <DialogTitle className="text-left text-sm leading-snug sm:text-base">
              {doc.heading}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <RoleTermsDocumentView audience={audience} showHeading={false} />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 px-6 py-4">
            <Link
              href={doc.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              Open full page
            </Link>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
