'use client';

import { useRef, useState } from 'react';
import { FileText, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FIRM_BROCHURE_ACCEPT,
  isFirmBrochurePdfUrl,
} from '@/lib/firm/constants';
import { removeFirmBrochure, uploadFirmBrochure } from '@/lib/firm/uploadFirmBrochure';
import { cn } from '@/lib/utils';

interface BrochureUploadProps {
  brochureUrl: string | null;
  onChanged?: (url: string | null) => void;
}

export function BrochureUpload({ brochureUrl, onChanged }: BrochureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(brochureUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPdf = isFirmBrochurePdfUrl(url);

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    const result = await uploadFirmBrochure(file);
    setUploading(false);

    if (result.error || !result.brochureUrl) {
      setError(result.error ?? 'Upload failed.');
      return;
    }

    setUrl(result.brochureUrl);
    onChanged?.(result.brochureUrl);
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    const result = await removeFirmBrochure();
    setUploading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setUrl(null);
    onChanged?.(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Company Brochure</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload a PDF or image clients can open with your portfolio and packages.
        </p>
      </div>

      {url ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 overflow-hidden">
            {isPdf ? (
              <FileText className="h-5 w-5 text-violet-400" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="Brochure preview" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">
              {isPdf ? 'Brochure PDF uploaded' : 'Brochure image uploaded'}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-violet-400 hover:underline"
            >
              Preview / open
            </a>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-400 h-8 px-2"
            disabled={uploading}
            onClick={() => void handleRemove()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors',
            'border-border hover:border-violet-400/50 hover:bg-violet-500/5',
            uploading && 'pointer-events-none opacity-70',
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Upload brochure</span>
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> PDF
                <span className="text-muted-foreground/40">·</span>
                <ImageIcon className="h-3 w-3" /> JPG / PNG / WebP
                <span className="text-muted-foreground/40">·</span>
                max 10 MB
              </span>
            </>
          )}
        </button>
      )}

      {url && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Replace brochure'}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={FIRM_BROCHURE_ACCEPT}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files)}
      />

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
