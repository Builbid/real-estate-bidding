import { createClient } from '@/lib/supabase/client';

const BUCKET = 'provider-verification';

export async function uploadProviderVerificationFile(
  userId: string,
  file: File,
  label: string,
): Promise<{ path: string | null; error: string | null }> {
  const supabase = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeLabel = label.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const path = `${userId}/${safeLabel}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) return { path: null, error: error.message };
  return { path, error: null };
}

export async function uploadProviderWorkPhoto(
  userId: string,
  file: File,
): Promise<{ publicUrl: string | null; error: string | null }> {
  const supabase = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/work-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('provider-work-photos').upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) return { publicUrl: null, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from('provider-work-photos').getPublicUrl(path);

  return { publicUrl, error: null };
}
