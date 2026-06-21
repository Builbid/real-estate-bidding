'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface Props {
  projectId: string;
  builderId: string;
  builderName?: string;
}

export function SelectBuilderButton({ projectId, builderId, builderName }: Props) {
  const router   = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSelect() {
    if (!confirm(`Select ${builderName ?? 'this builder'} for your project?`)) return;
    setLoading(true);

    await supabase.from('projects').update({
      selected_builder_id: builderId,
      status: 'completed',
    }).eq('id', projectId);

    router.refresh();
    setLoading(false);
  }

  return (
    <Button size="sm" onClick={handleSelect} disabled={loading}>
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : (
        <><UserCheck className="w-3.5 h-3.5" /> Select</>
      )}
    </Button>
  );
}
