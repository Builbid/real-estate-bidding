'use client';

import { createClient } from '@/lib/supabase/client';
import {
  clearFirmBrochureUrlAction,
  saveFirmBrochureUrlAction,
} from '@/app/actions/firm';
import {
  FIRM_BROCHURE_BUCKET,
  firmBrochureExtension,
  validateFirmBrochureFile,
} from '@/lib/firm/constants';

export async function uploadFirmBrochure(
  file: File,
): Promise<{ error: string | null; brochureUrl?: string }> {
  const validationError = validateFirmBrochureFile(file);
  if (validationError) return { error: validationError };

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'You must be signed in to upload a brochure.' };
  }

  const ext = firmBrochureExtension(file.type);
  const storagePath = `${user.id}/brochure.${ext}`;

  // Remove any previous brochure with a different extension
  const { data: existing } = await supabase.storage.from(FIRM_BROCHURE_BUCKET).list(user.id);
  const stale = (existing ?? [])
    .map((f) => f.name)
    .filter((name) => name.startsWith('brochure.') && name !== `brochure.${ext}`);
  if (stale.length > 0) {
    await supabase.storage
      .from(FIRM_BROCHURE_BUCKET)
      .remove(stale.map((name) => `${user.id}/${name}`));
  }

  const { error: uploadError } = await supabase.storage
    .from(FIRM_BROCHURE_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) {
    return { error: uploadError.message || 'Upload failed. Please try again.' };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(FIRM_BROCHURE_BUCKET).getPublicUrl(storagePath);

  return saveFirmBrochureUrlAction(`${publicUrl}?t=${Date.now()}`);
}

export async function removeFirmBrochure(): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'You must be signed in.' };
  }

  const { data: existing } = await supabase.storage.from(FIRM_BROCHURE_BUCKET).list(user.id);
  const brochureFiles = (existing ?? [])
    .map((f) => f.name)
    .filter((name) => name.startsWith('brochure.'));
  if (brochureFiles.length > 0) {
    await supabase.storage
      .from(FIRM_BROCHURE_BUCKET)
      .remove(brochureFiles.map((name) => `${user.id}/${name}`));
  }

  return clearFirmBrochureUrlAction();
}
