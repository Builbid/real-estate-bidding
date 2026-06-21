'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, XCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { ProjectStatus } from '@/lib/types';

interface Props {
  projectId: string;
  projectStatus: ProjectStatus;
}

export function AdminActionBar({ projectId, projectStatus }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function cancelProject() {
    if (!confirm('Cancel this project auction? This action cannot be undone.')) return;
    setLoading(true);
    await supabase.from('projects').update({ status: 'cancelled' }).eq('id', projectId);
    router.refresh();
    setLoading(false);
  }

  async function deleteProject() {
    if (!confirm('PERMANENTLY DELETE this project and all its bids? This cannot be undone.')) return;
    setLoading(true);
    await supabase.from('projects').delete().eq('id', projectId);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {projectStatus === 'active_24h' && (
        <button
          onClick={cancelProject}
          disabled={loading}
          title="Cancel Auction"
          className="p-1.5 rounded-md text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={deleteProject}
        disabled={loading}
        title="Delete Project"
        className="p-1.5 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
