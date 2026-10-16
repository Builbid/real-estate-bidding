import { PLATFORM_COPY } from '@/components/marketing/StaticPageShell';
import { ROLE_TERMS, type RoleTermsAudience } from '@/lib/legal/roleTerms';
import { cn } from '@/lib/utils';

export function RoleTermsDocumentView({
  audience,
  showHeading = true,
  className,
}: {
  audience: RoleTermsAudience;
  showHeading?: boolean;
  className?: string;
}) {
  const doc = ROLE_TERMS[audience];

  return (
    <div className={cn('space-y-6', className)}>
      {showHeading && (
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {doc.heading}
        </h2>
      )}
      {doc.intro && <p className={PLATFORM_COPY}>{doc.intro}</p>}
      <div className="space-y-6">
        {doc.sections.map((section) => (
          <section key={section.title} className="border-t border-border/40 pt-6">
            <h3 className="text-base font-medium tracking-tight text-foreground">{section.title}</h3>
            <p className={cn('mt-2', PLATFORM_COPY)}>{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
