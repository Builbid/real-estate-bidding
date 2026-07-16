'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadProviderVerificationFile, uploadProviderWorkPhoto } from '@/lib/provider/uploadProviderFiles';
import { submitProviderVerificationAction } from '@/app/actions/serviceProvider';
import type { ServiceProvider } from '@/lib/types/hireServices';

interface ProviderVerifyClientProps {
  userId: string;
  provider: ServiceProvider | null;
}

export function ProviderVerifyClient({ userId, provider }: ProviderVerifyClientProps) {
  const [idFile, setIdFile] = useState<File | null>(null);
  const [workFiles, setWorkFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitted = Boolean(provider?.verification_submitted_at);
  const verified = Boolean(provider?.is_verified);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idFile) {
      setError('Please upload a photo of your ID.');
      return;
    }
    if (workFiles.length < 2) {
      setError('Please upload at least 2 work photos.');
      return;
    }

    setPending(true);
    setError(null);

    const idUpload = await uploadProviderVerificationFile(userId, idFile, 'id');
    if (idUpload.error || !idUpload.path) {
      setError(idUpload.error ?? 'ID upload failed.');
      setPending(false);
      return;
    }

    const workPaths: string[] = [];
    const publicWorkUrls: string[] = [];
    for (let i = 0; i < workFiles.length; i++) {
      const priv = await uploadProviderVerificationFile(userId, workFiles[i], `work-${i + 1}`);
      if (priv.error || !priv.path) {
        setError(priv.error ?? 'Work photo upload failed.');
        setPending(false);
        return;
      }
      workPaths.push(priv.path);

      const pub = await uploadProviderWorkPhoto(userId, workFiles[i]);
      if (pub.publicUrl) publicWorkUrls.push(pub.publicUrl);
    }

    const docs = JSON.stringify({ id_path: idUpload.path, work_paths: workPaths, public_work_urls: publicWorkUrls });
    const result = await submitProviderVerificationAction(docs);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
  }

  if (verified) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
        Your profile is verified. Thank you!
      </p>
    );
  }

  if (submitted || success) {
    return (
      <p className="text-sm text-muted-foreground">
        Verification submitted on{' '}
        {provider?.verification_submitted_at
          ? new Date(provider.verification_submitted_at).toLocaleDateString('en-IN')
          : 'today'}
        . Our team will review your documents. Your listing stays active while you wait.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border p-5">
      <div>
        <label className="text-sm font-medium block mb-1.5">Government ID (photo or PDF)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1.5">Work photos (2–3)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setWorkFiles(Array.from(e.target.files ?? []).slice(0, 3))}
          className="text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for review'}
      </Button>
    </form>
  );
}
