'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { AVATAR_BUCKET, AVATAR_MAX_BYTES } from '@/lib/avatar/constants';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isValidStoredAvatarUrl(url: string, userId: string): boolean {
  try {
    const base = url.split('?')[0];
    const parsed = new URL(base);
    const expected = `/storage/v1/object/public/${AVATAR_BUCKET}/${userId}/avatar`;
    return parsed.pathname.startsWith(`${expected}.`);
  } catch {
    return false;
  }
}

/** Persist avatar URL after a direct client-side storage upload. */
export async function saveBuilderAvatarUrlAction(
  avatarUrl: string,
): Promise<{ error: string | null; avatarUrl?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'You must be signed in to upload a photo.' };
  }

  if (!isValidStoredAvatarUrl(avatarUrl, user.id)) {
    return { error: 'Invalid profile photo URL.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'labour_contractor') {
    return { error: 'Only labour contractor accounts can upload a profile photo.' };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);

  if (updateError) {
    return { error: updateError.message || 'Could not save profile photo.' };
  }

  revalidatePath('/dashboard/builder');
  revalidatePath('/dashboard/builder/bid', 'layout');

  return { error: null, avatarUrl };
}

/** Legacy server-side upload — prefer client `uploadBuilderAvatar()` for speed. */
export async function uploadBuilderAvatarAction(
  formData: FormData,
): Promise<{ error: string | null; avatarUrl?: string }> {
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Please select an image to upload.' };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: 'Only JPG, PNG, and WebP images are allowed.' };
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return { error: 'Image must be 2 MB or smaller.' };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'You must be signed in to upload a photo.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'labour_contractor') {
    return { error: 'Only labour contractor accounts can upload a profile photo.' };
  }

  const ext = EXT_BY_MIME[file.type] ?? 'jpg';
  const storagePath = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) {
    return { error: uploadError.message || 'Upload failed. Please try again.' };
  }

  const { data: { publicUrl } } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(storagePath);

  return saveBuilderAvatarUrlAction(`${publicUrl}?t=${Date.now()}`);
}

export async function removeBuilderAvatarAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'You must be signed in.' };
  }

  const { data: existingFiles } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(user.id);

  if (existingFiles && existingFiles.length > 0) {
    const pathsToRemove = existingFiles.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(pathsToRemove);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id);

  if (updateError) {
    return { error: updateError.message || 'Could not remove profile photo.' };
  }

  revalidatePath('/dashboard/builder');
  revalidatePath('/dashboard/builder/bid', 'layout');

  return { error: null };
}
