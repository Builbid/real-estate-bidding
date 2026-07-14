'use client';

import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CONTACT_INFO_WARNING, hasContactInfo } from '@/lib/validation/projectContactInfo';

interface WizardProjectTextFieldsProps {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  titleLabel?: string;
  descriptionLabel?: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  titleRequiredError?: string;
  descriptionMaxLength?: number;
  titleRef?: React.RefObject<HTMLInputElement | null>;
  descriptionRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function ContactInfoWarning() {
  return (
    <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 leading-snug">
      {CONTACT_INFO_WARNING}
    </p>
  );
}

function PrivacyNote() {
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground mt-1.5 leading-snug">
      <Lock className="h-3 w-3 flex-shrink-0 mt-0.5" aria-hidden />
      <span>
        Do not share phone numbers, emails or personal contact details. BuilBid protects your
        privacy.
      </span>
    </p>
  );
}

export function WizardProjectTextFields({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  titleLabel = 'Project Title',
  descriptionLabel = 'Description (optional)',
  titlePlaceholder = 'e.g. 2BHK Residential Construction, Delhi',
  descriptionPlaceholder = 'Additional notes about the project...',
  titleRequiredError,
  descriptionMaxLength,
  titleRef,
  descriptionRef,
}: WizardProjectTextFieldsProps) {
  const titleHasContact = hasContactInfo(title);
  const descriptionHasContact = hasContactInfo(description);

  return (
    <>
      <div>
        <Input
          ref={titleRef}
          label={titleLabel}
          type="text"
          placeholder={titlePlaceholder}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          error={titleRequiredError}
          className={cn(
            titleHasContact &&
              'border-red-500/70 focus:border-red-500/70 focus:ring-red-500/40',
          )}
          required
        />
        {titleHasContact && <ContactInfoWarning />}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {descriptionLabel}
        </label>
        <textarea
          ref={descriptionRef}
          className={cn(
            'w-full min-h-[80px] rounded-lg border border-border bg-card/80 dark:bg-card/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none',
            descriptionHasContact &&
              'border-red-500/70 focus:border-red-500/70 focus:ring-red-500/40',
          )}
          placeholder={descriptionPlaceholder}
          value={description}
          maxLength={descriptionMaxLength}
          onChange={(e) => {
            const next = descriptionMaxLength
              ? e.target.value.slice(0, descriptionMaxLength)
              : e.target.value;
            onDescriptionChange(next);
          }}
        />
        {descriptionHasContact && <ContactInfoWarning />}
        <PrivacyNote />
        {descriptionMaxLength != null && (
          <p className="text-[10px] text-muted-foreground text-right">
            {description.length}/{descriptionMaxLength}
          </p>
        )}
      </div>
    </>
  );
}
