'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { validateGstNumber } from '@/lib/validation/gst';
import { FIRM_LOGO_BUCKET, FIRM_PORTFOLIO_BUCKET, FIRM_PORTFOLIO_MAX_ITEMS, FIRM_PORTFOLIO_MAX_PHOTOS } from '@/lib/firm/constants';

function isValidStoredFirmLogoUrl(url: string, userId: string): boolean {
  try {
    const base = url.split('?')[0];
    const parsed = new URL(base);
    const expected = `/storage/v1/object/public/${FIRM_LOGO_BUCKET}/${userId}/logo`;
    return parsed.pathname.startsWith(`${expected}.`) || parsed.pathname === `${expected}.jpg`;
  } catch {
    return false;
  }
}

export async function saveFirmLogoUrlAction(
  logoUrl: string,
): Promise<{ error: string | null; logoUrl?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'You must be signed in.' };

  if (!isValidStoredFirmLogoUrl(logoUrl, user.id)) {
    return { error: 'Invalid company logo URL.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'construction_firm') {
    return { error: 'Only construction firm accounts can upload a company logo.' };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ logo_url: logoUrl })
    .eq('id', user.id);

  if (updateError) return { error: updateError.message || 'Could not save logo.' };

  revalidatePath('/dashboard/firm');
  revalidatePath('/dashboard/firm/settings');

  return { error: null, logoUrl };
}

export async function getFirmPortfolioAction(): Promise<{
  error: string | null;
  items: import('@/lib/types').FirmPortfolioItem[];
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.', items: [] };

  const { data, error } = await supabase
    .from('firm_portfolio')
    .select('*')
    .eq('firm_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message, items: [] };
  return { error: null, items: (data ?? []) as import('@/lib/types').FirmPortfolioItem[] };
}

export async function createFirmPortfolioItemAction(input: {
  project_name: string;
  location: string;
  year_completed: number;
  photos: string[];
  description?: string;
}): Promise<{ error: string | null; id?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'construction_firm') {
    return { error: 'Only construction firms can manage portfolio.' };
  }

  const { count } = await supabase
    .from('firm_portfolio')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', user.id);

  if ((count ?? 0) >= FIRM_PORTFOLIO_MAX_ITEMS) {
    return { error: `Maximum ${FIRM_PORTFOLIO_MAX_ITEMS} portfolio projects allowed.` };
  }

  if (input.photos.length > FIRM_PORTFOLIO_MAX_PHOTOS) {
    return { error: `Maximum ${FIRM_PORTFOLIO_MAX_PHOTOS} photos per project.` };
  }

  const { data, error } = await supabase
    .from('firm_portfolio')
    .insert({
      firm_id: user.id,
      project_name: input.project_name.trim(),
      location: input.location.trim(),
      year_completed: input.year_completed,
      photos: input.photos.length > 0 ? input.photos : null,
      description: input.description?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/firm/settings');
  return { error: null, id: data.id };
}

export async function deleteFirmPortfolioItemAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };

  const { error } = await supabase
    .from('firm_portfolio')
    .delete()
    .eq('id', id)
    .eq('firm_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/firm/settings');
  return { error: null };
}

export async function saveFirmPortfolioPhotoUrlAction(
  portfolioId: string,
  photoUrl: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not authenticated.' };

  try {
    const parsed = new URL(photoUrl.split('?')[0]);
    const expectedPrefix = `/storage/v1/object/public/${FIRM_PORTFOLIO_BUCKET}/${user.id}/${portfolioId}/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      return { error: 'Invalid portfolio photo URL.' };
    }
  } catch {
    return { error: 'Invalid portfolio photo URL.' };
  }

  return { error: null };
}

export async function getPublicFirmProfileAction(firmId: string): Promise<{
  error: string | null;
  firm: import('@/lib/types').PublicFirmProfile | null;
  portfolio: import('@/lib/types').FirmPortfolioItem[];
}> {
  const supabase = await createClient();

  const { data: firm, error } = await supabase
    .from('firms_public')
    .select('*')
    .eq('id', firmId)
    .maybeSingle();

  if (error || !firm) {
    return { error: error?.message ?? 'Firm not found.', firm: null, portfolio: [] };
  }

  const { data: portfolio } = await supabase
    .from('firm_portfolio')
    .select('*')
    .eq('firm_id', firmId)
    .order('year_completed', { ascending: false });

  return {
    error: null,
    firm: firm as import('@/lib/types').PublicFirmProfile,
    portfolio: (portfolio ?? []) as import('@/lib/types').FirmPortfolioItem[],
  };
}
