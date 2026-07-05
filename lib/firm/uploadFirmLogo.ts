'use client';

import { createClient } from '@/lib/supabase/client';
import { saveFirmLogoUrlAction } from '@/app/actions/firm';
import { compressAvatarImage } from '@/lib/avatar/compressImage';
import { FIRM_LOGO_BUCKET, validateFirmImageFile, FIRM_LOGO_MAX_BYTES } from '@/lib/firm/constants';

export async function uploadFirmLogo(
  file: File,
): Promise<{ error: string | null; logoUrl?: string }> {
  const validationError = validateFirmImageFile(file, FIRM_LOGO_MAX_BYTES);
  if (validationError) return { error: validationError };

  let blob: Blob;
  try {
    blob = await compressAvatarImage(file);
  } catch {
    return { error: 'Could not process this image. Try a different JPG or PNG.' };
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'You must be signed in to upload a logo.' };
  }

  const storagePath = `${user.id}/logo.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(FIRM_LOGO_BUCKET)
    .upload(storagePath, blob, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    return { error: uploadError.message || 'Upload failed. Please try again.' };
  }

  const { data: { publicUrl } } = supabase.storage
    .from(FIRM_LOGO_BUCKET)
    .getPublicUrl(storagePath);

  return saveFirmLogoUrlAction(`${publicUrl}?t=${Date.now()}`);
}

export async function prepareFirmLogoFile(file: File): Promise<{ error: string | null; file?: File }> {
  const validationError = validateFirmImageFile(file, FIRM_LOGO_MAX_BYTES);
  if (validationError) return { error: validationError };

  try {
    const blob = await compressAvatarImage(file);
    return { error: null, file: new File([blob], 'logo.jpg', { type: 'image/jpeg' }) };
  } catch {
    return { error: 'Could not process this image. Try a different JPG or PNG.' };
  }
}
