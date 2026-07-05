'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { selectBuilderAction } from '@/app/actions/select';
import { Button } from '@/components/ui/button';

interface Props {
  projectId:   string;
  builderId:   string;
  builderName?: string;
}

export function SelectBuilderButton({ projectId, builderId, builderName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSelect() {
    if (!confirm(`Select ${builderName ?? 'this builder'} for your project?\n\nA confirmation email will be sent to builbidcorp@gmail.com.`)) return;
    setLoading(true);
    setError(null);

    const result = await selectBuilderAction(projectId, builderId, builderName);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
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
