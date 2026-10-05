'use client';

import { useState } from 'react';
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
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <ClipboardCheck className="h-4 w-4 text-emerald-400" />
            {profile.title}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{projectTitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-slate-700/50 bg-slate-950 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-100"
        >
          {open ? 'Hide Quality Control Form' : 'View Quality Control Form'}
        </button>
      </div>
      {open ? (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-slate-400">{profile.intro}</p>
          {profile.sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-300">{section.heading}</h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-slate-200">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
