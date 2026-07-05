'use client';

import { createClient } from '@/lib/supabase/client';

const BUCKET = 'project-drawings';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

export async function uploadProjectDrawing(
  projectId: string,
  file: File,
): Promise<{ error: string | null; url?: string }> {
  if (!ALLOWED.has(file.type)) {
    return { error: 'Accepted formats: PDF, JPG, PNG.' };
  }
  if (file.size > MAX_BYTES) {
    return { error: 'File must be 10 MB or smaller.' };
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg';
  const path = `${user.id}/${projectId}/drawing.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('projects')
    .update({ drawing_url: publicUrl })
    .eq('id', projectId)
    .eq('owner_id', user.id);

  if (updateError) return { error: updateError.message };

  return { error: null, url: publicUrl };
}
