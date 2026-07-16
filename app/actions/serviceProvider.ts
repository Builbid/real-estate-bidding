'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { stripMobileDigits, validateMobile } from '@/lib/validation/mobile';

export async function upsertServiceProviderProfileAction(
  _prev: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const fullName = (formData.get('full_name') as string | null)?.trim() ?? '';
  const phone = stripMobileDigits((formData.get('phone') as string | null) ?? '');
  const district = (formData.get('district') as string | null)?.trim() ?? '';
  const bio = (formData.get('bio') as string | null)?.trim() ?? '';
  const startingRateRaw = (formData.get('starting_rate') as string | null)?.trim() ?? '';
  const categoryIds = formData.getAll('category_ids') as string[];
  const categorySlug = (formData.get('category_slug') as string | null)?.trim() ?? '';

  if (!fullName) return { error: 'Full name is required.', success: false };
  const phoneError = validateMobile(phone);
  if (phoneError) return { error: phoneError, success: false };
  if (!district) return { error: 'District is required.', success: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Please verify your phone first.', success: false };

  let resolvedCategoryIds = categoryIds.filter(Boolean);
  if (resolvedCategoryIds.length === 0 && categorySlug) {
    const { data: cat } = await supabase
      .from('service_categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();
    if (cat?.id) resolvedCategoryIds = [cat.id];
  }

  if (resolvedCategoryIds.length === 0) {
    return { error: 'Select at least one service category.', success: false };
  }

  let startingRate: number | null = null;
  if (startingRateRaw) {
    const parsed = parseFloat(startingRateRaw);
    if (Number.isNaN(parsed) || parsed < 0) {
      return { error: 'Starting rate must be a valid number.', success: false };
    }
    startingRate = parsed;
  }

  const { error } = await supabase.from('service_providers').upsert(
    {
      id: user.id,
      full_name: fullName,
      phone,
      district,
      categories: resolvedCategoryIds,
      starting_rate: startingRate,
      bio: bio || null,
      status: 'active',
      is_verified: false,
    },
    { onConflict: 'id' },
  );

  if (error) return { error: error.message, success: false };

  revalidatePath('/provider/dashboard');
  return { error: null, success: true };
}

export async function updateServiceProviderProfileAction(
  _prev: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const fullName = (formData.get('full_name') as string | null)?.trim() ?? '';
  const district = (formData.get('district') as string | null)?.trim() ?? '';
  const bio = (formData.get('bio') as string | null)?.trim() ?? '';
  const startingRateRaw = (formData.get('starting_rate') as string | null)?.trim() ?? '';
  const categoryIds = formData.getAll('category_ids') as string[];
  const workPhotoUrlsRaw = (formData.get('work_photo_urls') as string | null)?.trim() ?? '';

  if (!fullName) return { error: 'Full name is required.', success: false };
  if (!district) return { error: 'District is required.', success: false };
  if (categoryIds.length === 0) return { error: 'Select at least one category.', success: false };

  let startingRate: number | null = null;
  if (startingRateRaw) {
    const parsed = parseFloat(startingRateRaw);
    if (Number.isNaN(parsed) || parsed < 0) {
      return { error: 'Starting rate must be a valid number.', success: false };
    }
    startingRate = parsed;
  }

  const workPhotoUrls = workPhotoUrlsRaw
    ? workPhotoUrlsRaw.split('\n').map((u) => u.trim()).filter(Boolean)
    : [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.', success: false };

  const { error } = await supabase
    .from('service_providers')
    .update({
      full_name: fullName,
      district,
      categories: categoryIds,
      starting_rate: startingRate,
      bio: bio || null,
      work_photo_urls: workPhotoUrls,
    })
    .eq('id', user.id);

  if (error) return { error: error.message, success: false };

  revalidatePath('/provider/dashboard');
  revalidatePath(`/hire-services/provider/${user.id}`);
  return { error: null, success: true };
}

export async function submitProviderVerificationAction(
  verificationDocsJson: string,
): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.', success: false };

  let workPhotoUrls: string[] | undefined;
  try {
    const parsed = JSON.parse(verificationDocsJson) as { public_work_urls?: string[] };
    if (Array.isArray(parsed.public_work_urls) && parsed.public_work_urls.length > 0) {
      workPhotoUrls = parsed.public_work_urls;
    }
  } catch {
    /* ignore parse for work urls */
  }

  const payload: Record<string, unknown> = {
    verification_submitted_at: new Date().toISOString(),
    verification_docs_url: verificationDocsJson,
  };
  if (workPhotoUrls) payload.work_photo_urls = workPhotoUrls;

  const { error } = await supabase.from('service_providers').update(payload).eq('id', user.id);

  if (error) return { error: error.message, success: false };

  revalidatePath('/provider/verify');
  revalidatePath('/admin/verifications');
  return { error: null, success: true };
}

export async function adminSetProviderVerifiedAction(
  providerId: string,
  approve: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Admin access required.' };

  const updates = approve
    ? { is_verified: true }
    : {
        is_verified: false,
        verification_submitted_at: null,
        verification_docs_url: null,
      };

  const { error } = await supabase.from('service_providers').update(updates).eq('id', providerId);

  if (error) return { error: error.message };

  revalidatePath('/admin/verifications');
  revalidatePath(`/hire-services/provider/${providerId}`);
  return { error: null };
}
