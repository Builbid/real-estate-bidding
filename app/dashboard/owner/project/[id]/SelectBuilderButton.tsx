'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  projectId: string;
  builderId: string;
  builderName?: string;
}

export function SelectBuilderButton({ projectId, builderId, builderName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect() {
    const pid = projectId?.trim();
    const bid = builderId?.trim();
    if (!pid || !bid) {
      setError('Project or builder is missing. Refresh the page and try again.');
      return;
    }
    if (!confirm(`Select ${builderName ?? 'this builder'} for your project?\n\nA confirmation email will be sent to builbidcorp@gmail.com.`)) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/select-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: pid,
          builderId: bid,
          builderName,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; success?: boolean } | null;
      if (!res.ok || body?.error) {
        const message = body?.error || 'Could not select this builder. Please try again.';
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      toast.success('Builder Selected Successfully');
      router.refresh();
    } catch {
      const message = 'Could not select this builder. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleSelect} disabled={loading}>
        {loading ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <><UserCheck className="w-3.5 h-3.5" /> Select</>
        )}
      </Button>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
