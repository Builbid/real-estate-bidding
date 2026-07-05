'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DrawingChoice = 'upload' | 'firm_creates' | null;

interface DrawingUploadStepProps {
  choice: DrawingChoice;
  onChoiceChange: (choice: DrawingChoice) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

export function DrawingUploadStep({
  choice,
  onChoiceChange,
  file,
  onFileChange,
}: DrawingUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  function validateAndSet(f: File) {
    setError(null);
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(f.type)) {
      setError('Accepted formats: PDF, JPG, PNG.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('Max size: 10MB.');
      return;
    }
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p == null || p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 20;
      });
    }, 80);
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      onFileChange(f);
    }, 500);
  }

  function handleFiles(list: FileList | null) {
    const f = list?.[0];
    if (f) validateAndSet(f);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Do you have an engineering drawing?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          If you already have a house plan or drawing, upload it here. If not, the construction firm will create one for you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => { onChoiceChange('upload'); setError(null); }}
          className={cn(
            'text-left rounded-xl border-2 p-4 transition-all',
            choice === 'upload' ? 'border-indigo-500/60 bg-indigo-500/8' : 'border-border bg-secondary/30',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📐</span>
            {choice === 'upload' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          </div>
          <p className="text-sm font-bold text-foreground">Yes, I have a drawing</p>
        </button>
        <button
          type="button"
          onClick={() => { onChoiceChange('firm_creates'); onFileChange(null); setError(null); setUploadProgress(null); }}
          className={cn(
            'text-left rounded-xl border-2 p-4 transition-all',
            choice === 'firm_creates' ? 'border-indigo-500/60 bg-indigo-500/8' : 'border-border bg-secondary/30',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✏️</span>
            {choice === 'firm_creates' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          </div>
          <p className="text-sm font-bold text-foreground">No, let the firm create it</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            The construction firm will design a drawing based on your requirements
          </p>
        </button>
      </div>

      {choice === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={cn(
            'rounded-xl border-2 border-dashed p-6 text-center transition-colors',
            dragOver ? 'border-indigo-400 bg-indigo-500/5' : 'border-border',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <FileText className="w-4 h-4" />
                {file.name}
                <span className="text-muted-foreground text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              {uploadProgress != null && uploadProgress < 100 && (
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden max-w-xs mx-auto">
                  <div className="h-full bg-indigo-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              {uploadProgress === 100 && (
                <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400" />
              )}
              <button
                type="button"
                onClick={() => { onFileChange(null); setUploadProgress(null); }}
                className="text-xs text-red-400 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Drag & drop or click to browse</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Choose file
              </button>
            </>
          )}
          <p className="text-[10px] text-muted-foreground mt-3">Accepted formats: PDF, JPG, PNG. Max size: 10MB</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
