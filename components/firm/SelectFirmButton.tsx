'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { selectBuilderAction } from '@/app/actions/select';
import { Button } from '@/components/ui/button';

interface Props {
  projectId: string;
  firmId: string;
  companyName?: string;
}

export function SelectFirmButton({ projectId, firmId, companyName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect() {
    const label = companyName ?? 'this firm';
    if (!confirm(`Select ${label} for your project?\n\nBuilBid will coordinate next steps.`)) return;
    setLoading(true);
    setError(null);

    const result = await selectBuilderAction(projectId, firmId, companyName);
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
      <Button size="sm" onClick={handleSelect} disabled={loading} className="bg-violet-600 hover:bg-violet-500">
        {loading ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <><UserCheck className="w-3.5 h-3.5" /> Select This Firm</>
        )}
      </Button>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
