'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { adminSetProviderVerifiedAction } from '@/app/actions/serviceProvider';
import type { ServiceProvider } from '@/lib/types/hireServices';

interface AdminVerificationsClientProps {
  pending: ServiceProvider[];
}

export function AdminVerificationsClient({ pending }: AdminVerificationsClientProps) {
  const [isPending, startTransition] = useTransition();

  function act(providerId: string, approve: boolean) {
    startTransition(async () => {
      await adminSetProviderVerifiedAction(providerId, approve);
    });
  }

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
        No pending verification submissions.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {pending.map((p) => (
        <li key={p.id} className="rounded-xl border border-border p-4 bg-card/50">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{p.full_name}</p>
              <p className="text-xs text-muted-foreground">{p.district} · {p.phone}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Submitted {p.verification_submitted_at ? new Date(p.verification_submitted_at).toLocaleString('en-IN') : '—'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={isPending} onClick={() => act(p.id, true)}>
                Approve
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => act(p.id, false)}>
                Reject
              </Button>
            </div>
          </div>
          {p.verification_docs_url && (
            <pre className="mt-3 text-[10px] bg-secondary/50 p-2 rounded overflow-x-auto text-muted-foreground">
              {p.verification_docs_url}
            </pre>
          )}
        </li>
      ))}
    </ul>
  );
}
