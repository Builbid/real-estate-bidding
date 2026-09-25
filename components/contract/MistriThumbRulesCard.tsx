'use client';

import { useState } from 'react';
import { Download, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function MistriThumbRulesCard({ projectId }: { projectId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/thumb-rules/pdf?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Could not download the thumb-rule PDF.');
      }
      const blob = await res.blob();
      const header = res.headers.get('Content-Disposition');
      const match = header?.match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = match?.[1] ?? `Site-Thumb-Rules-${projectId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="border-teal-500/25">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ruler className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          Site thumb rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          A site booklet for you and the Head Mason: plain-language summary, sketches, bar
          schedule, and a material check-list from this project. Guidance only, not a structural
          design.
        </p>
        <Button type="button" variant="outline" onClick={() => void downloadPdf()} disabled={downloading}>
          <Download className="h-4 w-4" />
          {downloading ? 'Preparing PDF…' : 'Download thumb-rule PDF'}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
