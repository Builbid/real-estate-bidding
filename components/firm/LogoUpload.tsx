'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { prepareFirmLogoFile } from '@/lib/firm/uploadFirmLogo';
import { FIRM_IMAGE_ACCEPT } from '@/lib/firm/constants';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  companyName: string;
  logoUrl?: string | null;
  onFileSelected?: (file: File | null) => void;
  deferred?: boolean;
}

export function LogoUpload({
  companyName,
  logoUrl,
  onFileSelected,
  deferred = false,
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [picked, setPicked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview ?? logoUrl ?? null;

  const resetPreview = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPicked(false);
  }, [preview]);

  async function processFile(file: File) {
    setError(null);
    setUploading(true);

    const prepared = await prepareFirmLogoFile(file);
    if (prepared.error || !prepared.file) {
      setError(prepared.error ?? 'Could not process image.');
      setUploading(false);
      return;
    }

    resetPreview();
    setPreview(URL.createObjectURL(prepared.file));
    onFileSelected?.(prepared.file);
    setPicked(true);
    setUploading(false);
  }

  function handleFileSelect(fileList: FileList | null) {
    const file = fileList?.[0];
    if (file) void processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col items-center gap-2 mb-2">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'relative w-24 h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all cursor-pointer',
          dragOver ? 'border-violet-400 bg-violet-500/10' : 'border-border bg-secondary/40 hover:border-muted-foreground',
          picked && !uploading && 'border-violet-500/70 ring-2 ring-violet-500/30',
          uploading && 'pointer-events-none opacity-80',
        )}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="Logo preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <UserAvatar
            name={companyName || 'Firm'}
            size="registration"
            gradient="from-violet-500 to-indigo-600"
          />
        )}

        {!displayUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white mb-0.5" />
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
          </div>
        )}

        {picked && !uploading && (
          <div className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-violet-500 border-2 border-card flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={FIRM_IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      <p className="text-xs font-medium text-foreground">Company Logo</p>
      <p className="text-[11px] text-muted-foreground text-center max-w-[240px] leading-snug">
        Your logo appears on your bids and profile.{' '}
        <span className="text-muted-foreground/80">(Optional)</span>
      </p>
      <p className="text-[10px] text-muted-foreground/70 text-center max-w-[240px]">
        Firms with a logo appear more professional to project owners
      </p>

      {error && (
        <p className="text-xs text-red-400 text-center max-w-[240px]" role="alert">{error}</p>
      )}
    </div>
  );
}
