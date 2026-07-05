'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { removeBuilderAvatarAction } from '@/app/actions/profile';
import { uploadBuilderAvatar, prepareAvatarFile } from '@/lib/avatar/uploadBuilderAvatar';
import { AVATAR_ACCEPT, validateAvatarFile } from '@/lib/avatar/constants';
import { useOptionalProfileUpdate } from '@/lib/context/ProfileProvider';
import { cn } from '@/lib/utils';

const ACCEPT = AVATAR_ACCEPT;

interface AvatarUploadProps {
  fullName: string;
  avatarUrl?: string | null;
  onUploaded?: (url: string | null) => void;
  /** When set, file is held locally until parent uploads after auth. */
  onFileSelected?: (file: File | null) => void;
  deferred?: boolean;
  compact?: boolean;
  /** Minimal dashed-circle layout for the registration form (first field). */
  registration?: boolean;
}

export function AvatarUpload({
  fullName,
  avatarUrl,
  onUploaded,
  onFileSelected,
  deferred = false,
  compact = false,
  registration = false,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [picked, setPicked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileUpdate = useOptionalProfileUpdate();

  const displayUrl = preview ?? currentUrl;
  const avatarSize = registration ? 'registration' : (compact ? 'lg' : 'xl');

  const resetPreview = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPicked(false);
  }, [preview]);

  function validateClient(file: File): string | null {
    return validateAvatarFile(file);
  }

  async function processFile(file: File) {
    setError(null);
    const validationError = validateClient(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    resetPreview();
    setUploading(true);

    if (deferred) {
      const prepared = await prepareAvatarFile(file);
      if (prepared.error || !prepared.file) {
        setError(prepared.error ?? 'Could not process image.');
        setUploading(false);
        return;
      }
      setPreview(URL.createObjectURL(prepared.file));
      onFileSelected?.(prepared.file);
      setPicked(true);
      setUploading(false);
      return;
    }

    setPreview(URL.createObjectURL(file));

    const result = await uploadBuilderAvatar(file);

    if (result.error) {
      setError(result.error);
      resetPreview();
      setUploading(false);
      return;
    }

    resetPreview();
    setCurrentUrl(result.avatarUrl ?? null);
    profileUpdate?.updateAvatarUrl(result.avatarUrl ?? null);
    onUploaded?.(result.avatarUrl ?? null);
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

  async function handleRemove() {
    setError(null);

    if (deferred) {
      resetPreview();
      onFileSelected?.(null);
      return;
    }

    setUploading(true);
    const result = await removeBuilderAvatarAction();
    if (result.error) {
      setError(result.error);
    } else {
      resetPreview();
      setCurrentUrl(null);
      profileUpdate?.updateAvatarUrl(null);
      onUploaded?.(null);
    }
    setUploading(false);
  }

  if (registration) {
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
            dragOver ? 'border-emerald-400 bg-emerald-500/10' : 'border-border bg-secondary/40 hover:border-muted-foreground',
            picked && !uploading && 'border-emerald-500/70 ring-2 ring-emerald-500/30',
            uploading && 'pointer-events-none opacity-80',
          )}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="Profile preview" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <>
              <Camera className="w-7 h-7 text-muted-foreground mb-0.5" />
              <span className="text-[10px] text-muted-foreground font-medium">Upload Photo</span>
            </>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
            </div>
          )}

          {picked && !uploading && (
            <div className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <p className="text-[11px] text-muted-foreground text-center max-w-[220px] leading-snug">
          Contractors with a profile photo get more owner trust
        </p>

        {error && (
          <p className="text-xs text-red-400 text-center max-w-[240px]" role="alert">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center', compact ? 'gap-3' : 'gap-4')}>
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
          'relative rounded-full transition-all cursor-pointer group',
          dragOver && 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-background',
          uploading && 'pointer-events-none opacity-80',
        )}
      >
        <UserAvatar
          name={fullName}
          avatarUrl={displayUrl}
          size={avatarSize}
          gradient="from-emerald-500 to-teal-600"
        />

        <div className={cn(
          'absolute inset-0 rounded-full flex items-center justify-center',
          'bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
          uploading && 'opacity-100',
        )}>
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>

        {uploading && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-emerald-400 animate-pulse w-full" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {!compact && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Contractors with a profile photo get more owner trust.{' '}
          <span className="text-muted-foreground/80">(Optional)</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" />
          {currentUrl || preview ? 'Replace Photo' : 'Upload Photo'}
        </Button>
        {((currentUrl && !deferred) || (deferred && preview)) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => void handleRemove()}
          >
            <X className="w-3.5 h-3.5" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/80 text-center">
        JPG, PNG, or WebP · Max 2 MB · Drag &amp; drop supported
      </p>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
