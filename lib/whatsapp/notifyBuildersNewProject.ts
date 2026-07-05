import { createAdminClient } from '@/lib/supabase/admin';
import { getWhatsAppConfig } from './config';
import { buildNewProjectInvitationMessage, type NewProjectWhatsAppPayload } from './newProjectMessage';
import { sendWhatsAppMessage } from './sendMessage';
import { normalizePhoneE164 } from './phone';

export interface NotifyBuildersResult {
  skipped: boolean;
  reason?: string;
  totalBuilders: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Notify every registered builder (with a valid mobile) about a new project.
 * Safe to call from background jobs — failures are logged, not thrown.
 */
export async function notifyBuildersNewProject(
  project: NewProjectWhatsAppPayload,
): Promise<NotifyBuildersResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    console.info('[whatsapp] Skipping new-project alerts — WhatsApp not configured');
    return {
      skipped: true,
      reason: 'not_configured',
      totalBuilders: 0,
      sent: 0,
      failed: 0,
      errors: [],
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Admin client unavailable';
    console.error('[whatsapp] Cannot fetch builders:', msg);
    return {
      skipped: true,
      reason: msg,
      totalBuilders: 0,
      sent: 0,
      failed: 0,
      errors: [msg],
    };
  }

  const { data: builders, error } = await admin
    .from('profiles')
    .select('id, full_name, mobile')
    .in('role', ['labour_contractor', 'construction_firm']);

  if (error) {
    console.error('[whatsapp] Builder fetch failed:', error.message);
    return {
      skipped: true,
      reason: error.message,
      totalBuilders: 0,
      sent: 0,
      failed: 0,
      errors: [error.message],
    };
  }

  const recipients = (builders ?? []).filter(
    (b) => b.mobile && normalizePhoneE164(b.mobile),
  );

  if (recipients.length === 0) {
    console.info('[whatsapp] No builders with valid mobile numbers to notify');
    return {
      skipped: true,
      reason: 'no_recipients',
      totalBuilders: 0,
      sent: 0,
      failed: 0,
      errors: [],
    };
  }

  const message = buildNewProjectInvitationMessage(project);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const builder of recipients) {
    const result = await sendWhatsAppMessage(builder.mobile!, message);
    if (result.ok) {
      sent++;
    } else {
      failed++;
      errors.push(`${builder.id}: ${result.error ?? 'send failed'}`);
      console.warn(`[whatsapp] Failed for builder ${builder.id}:`, result.error);
    }

    // Gentle pacing to respect provider rate limits
    await new Promise((r) => setTimeout(r, 150));
  }

  console.info(
    `[whatsapp] New project "${project.title}" — sent ${sent}/${recipients.length}, failed ${failed}`,
  );

  return {
    skipped: false,
    totalBuilders: recipients.length,
    sent,
    failed,
    errors,
  };
}
