import { createAdminClient } from '@/lib/supabase/admin';
import { getWhatsAppConfig } from './config';
import {
  buildSelectionCongratulationsMessage,
  type SelectionWhatsAppPayload,
} from './selectionMessage';
import { sendWhatsAppMessage } from './sendMessage';
import { normalizePhoneE164 } from './phone';

export interface NotifySelectedBuilderInput {
  builderId: string;
  isFirmProject: boolean;
  projectTitle: string;
  district: string;
  constructionType: string;
  bidAmount: string | null;
  clientName: string;
  recipientDisplayName?: string;
}

export interface NotifySelectedBuilderResult {
  skipped: boolean;
  reason?: string;
  sent: boolean;
  error?: string;
}

/**
 * Send a WhatsApp congratulations message to the selected builder or firm.
 * Best-effort — safe to call from background jobs; never throws.
 */
export async function notifySelectedBuilder(
  input: NotifySelectedBuilderInput,
): Promise<NotifySelectedBuilderResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    console.info('[whatsapp] Skipping selection alert — WhatsApp not configured');
    return { skipped: true, reason: 'not_configured', sent: false };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Admin client unavailable';
    console.error('[whatsapp] Cannot fetch selected builder profile:', msg);
    return { skipped: true, reason: msg, sent: false };
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('full_name, company_name, mobile, role')
    .eq('id', input.builderId)
    .single();

  if (error || !profile) {
    console.error('[whatsapp] Selected builder profile fetch failed:', error?.message);
    return {
      skipped: true,
      reason: error?.message ?? 'profile_not_found',
      sent: false,
    };
  }

  const mobile = profile.mobile ? normalizePhoneE164(profile.mobile) : null;
  if (!mobile) {
    console.info(
      `[whatsapp] Selected builder ${input.builderId} has no valid mobile (stored: ${profile.mobile ?? 'empty'}) — skipping`,
    );
    return { skipped: true, reason: 'no_mobile', sent: false };
  }

  const maskedMobile = `${mobile.slice(0, 3)}***${mobile.slice(-4)}`;
  console.info(`[whatsapp] Sending selection alert to ${maskedMobile} (${input.builderId})`);

  const recipientName =
    input.recipientDisplayName ??
    profile.company_name ??
    profile.full_name ??
    (input.isFirmProject ? 'Partner' : 'Builder');

  const messagePayload: SelectionWhatsAppPayload = {
    recipientName,
    isFirmProject: input.isFirmProject,
    projectTitle: input.projectTitle,
    district: input.district,
    constructionType: input.constructionType,
    bidAmount: input.bidAmount,
    clientName: input.clientName,
    recipientRole: profile.role,
  };

  const message = buildSelectionCongratulationsMessage(messagePayload);
  const result = await sendWhatsAppMessage(profile.mobile!, message);

  if (result.ok) {
    console.info(
      `[whatsapp] Selection alert sent to ${input.builderId} for "${input.projectTitle}"`,
    );
    return { skipped: false, sent: true };
  }

  console.warn(`[whatsapp] Selection alert failed for ${input.builderId}:`, result.error);
  return {
    skipped: false,
    sent: false,
    error: result.error ?? 'send failed',
  };
}
