import { ClipboardCheck } from 'lucide-react';
import { qualityControlProfileForService } from '@/lib/contract/qualityControl';

export function QualityControlForm({
  serviceType,
  projectTitle,
}: {
  serviceType: string | null;
  projectTitle: string;
}) {
  const profile = qualityControlProfileForService(serviceType);

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <ClipboardCheck className="h-4 w-4 text-emerald-600" />
        {profile.title}
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {projectTitle}. {profile.intro}
      </p>
      <div className="mt-4 space-y-4">
        {profile.sections.map((section) => (
          <div key={section.heading}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              {section.heading}
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-200">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
