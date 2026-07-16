'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { stripMobileDigits, validateMobile } from '@/lib/validation/mobile';

export async function createCallbackRequestAction(
  _prev: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const providerId = (formData.get('provider_id') as string | null)?.trim() ?? '';
  const clientPhone = stripMobileDigits((formData.get('client_phone') as string | null) ?? '');

  const phoneError = validateMobile(clientPhone);
  if (phoneError) return { error: phoneError, success: false };
  if (!providerId) return { error: 'Provider not found.', success: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to request a callback.', success: false };

  const { error } = await supabase.from('callback_requests').insert({
    client_id: user.id,
    provider_id: providerId,
    client_phone: clientPhone,
    status: 'pending',
  });

  if (error) return { error: error.message, success: false };

  revalidatePath(`/hire-services/provider/${providerId}`);
  return { error: null, success: true };
}

export async function updateCallbackStatusAction(
  requestId: string,
  status: 'pending' | 'contacted' | 'completed',
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { error } = await supabase
    .from('callback_requests')
    .update({ status })
    .eq('id', requestId)
    .eq('provider_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/provider/dashboard');
  return { error: null };
}
