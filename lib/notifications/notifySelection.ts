import { createAdminClient } from '@/lib/supabase/admin';
import { buildSelectionSmsMessage } from '@/lib/sms/selectionMessage';
import { getSmsConfig } from '@/lib/sms/config';
import { sendSmsMessage } from '@/lib/sms/sendMessage';
import { getTwilioCredentials } from '@/lib/twilio/credentials';
import { getWhatsAppConfig, isWhatsAppProductionEnabled } from '@/lib/whatsapp/config';
import {
  buildSelectionCongratulationsMessage,
} from '@/lib/whatsapp/selectionMessage';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sendMessage';
import { normalizePhoneE164 } from '@/lib/whatsapp/phone';

export interface NotifySelectionInput {
  builderId: string;
  isFirmProject: boolean;
  projectTitle: string;
  district: string;
  constructionType: string;
  bidAmount: string | null;
  clientName: string;
  recipientDisplayName?: string;
}

function maskPhone(e164: string): string {
  return `${e164.slice(0, 3)}***${e164.slice(-4)}`;
}

/**
 * Notify the selected builder/firm via SMS (default) and WhatsApp (production only).
 * Best-effort — never throws.
 */
export async function notifySelection(input: NotifySelectionInput): Promise<void> {
  const smsConfig = getSmsConfig();
  const whatsappConfig = getWhatsAppConfig();

  if (!smsConfig && !whatsappConfig) {
    if (
      !isWhatsAppProductionEnabled() &&
      getTwilioCredentials() &&
      process.env.TWILIO_WHATSAPP_FROM?.trim()
    ) {
      console.info(
        '[notify] WhatsApp skipped until WHATSAPP_PRODUCTION=true. Set TWILIO_SMS_FROM for SMS selection alerts.',
      );
    } else {
      console.info(
        '[notify] Selection outbound alerts skipped — set TWILIO_SMS_FROM (SMS) and/or ' +
          'WHATSAPP_PRODUCTION=true with approved WhatsApp credentials.',
      );
    }
    return;
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Admin client unavailable';
    console.error('[notify] Cannot fetch selected builder profile:', msg);
    return;
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('full_name, company_name, mobile, role')
    .eq('id', input.builderId)
    .single();

  if (error || !profile) {
    console.error('[notify] Selected builder profile fetch failed:', error?.message);
    return;
  }

  const mobile = profile.mobile ? normalizePhoneE164(profile.mobile) : null;
  if (!mobile) {
    console.info(
      `[notify] Selected builder ${input.builderId} has no valid mobile (stored: ${profile.mobile ?? 'empty'}) — skipping SMS/WhatsApp`,
    );
    return;
  }

  const masked = maskPhone(mobile);
  const recipientName =
    input.recipientDisplayName ??
    profile.company_name ??
    profile.full_name ??
    (input.isFirmProject ? 'Partner' : 'Builder');

  const smsPayload = {
    isFirmProject: input.isFirmProject,
    projectTitle: input.projectTitle,
    district: input.district,
    constructionType: input.constructionType,
    bidAmount: input.bidAmount,
    clientName: input.clientName,
    recipientRole: profile.role,
  };

  if (smsConfig) {
    console.info(`[sms] Sending selection alert to ${masked} (${input.builderId})`);
    const smsResult = await sendSmsMessage(profile.mobile!, buildSelectionSmsMessage(smsPayload));
    if (smsResult.ok) {
      console.info(`[sms] Selection alert sent for "${input.projectTitle}"`);
    } else {
      console.warn(`[sms] Selection alert failed for ${input.builderId}:`, smsResult.error);
    }
  }

  if (whatsappConfig) {
    console.info(`[whatsapp] Sending production selection alert to ${masked} (${input.builderId})`);
    const waResult = await sendWhatsAppMessage(
      profile.mobile!,
      buildSelectionCongratulationsMessage({
        recipientName,
        ...smsPayload,
      }),
    );
    if (waResult.ok) {
      console.info(`[whatsapp] Selection alert sent for "${input.projectTitle}"`);
    } else {
      console.warn(`[whatsapp] Selection alert failed for ${input.builderId}:`, waResult.error);
    }
  } else if (!isWhatsAppProductionEnabled() && process.env.TWILIO_WHATSAPP_FROM?.trim()) {
    console.info(
      '[whatsapp] Selection alert not sent — WHATSAPP_PRODUCTION is not true (sandbox disabled in app)',
    );
  }
}
