'use client';

import { createClient } from '@/lib/supabase/client';
import { saveServiceProviderAvatarUrlAction } from '@/app/actions/serviceProvider';
import { AVATAR_BUCKET, validateAvatarFile } from '@/lib/avatar/constants';
import { compressAvatarImage } from '@/lib/avatar/compressImage';

export async function uploadServiceProviderAvatar(
  file: File,
): Promise<{ error: string | null; avatarUrl?: string }> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    return { error: validationError };
  }

  let blob: Blob;
  try {
    blob = await compressAvatarImage(file);
  } catch {
    return { error: 'Could not process this image. Try a different JPG or PNG.' };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'You must be signed in to upload a photo.' };
  }

  const storagePath = `${user.id}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, blob, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    return { error: uploadError.message || 'Upload failed. Please try again.' };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);

  return saveServiceProviderAvatarUrlAction(`${publicUrl}?t=${Date.now()}`);
}
