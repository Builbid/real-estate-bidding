import { createAdminClient } from '@/lib/supabase/admin';
import { sendUserNotificationEmail } from '@/lib/email/sendNotification';
import { getConstructionLabel } from '@/lib/utils';
import { isTradeServiceType, getTradeLabel } from '@/lib/trades';
import type { ServiceType, SubConfiguration, TrackType } from '@/lib/types';

export interface NewProjectAnnouncementInput {
  projectId: string;
  title: string;
  district: string;
  state: string;
  track_type: TrackType;
  sub_configuration: SubConfiguration;
  bidding_ends_at: string;
  serviceType: ServiceType;
}

type BidderRecipient = {
  email: string;
  full_name: string;
};

async function fetchBidderRecipients(serviceType: ServiceType): Promise<BidderRecipient[]> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.warn('Admin client unavailable — skipping new project announcement emails.');
    return [];
  }

  let query = admin.from('profiles').select('email, full_name');

  if (isTradeServiceType(serviceType)) {
    query = query.eq('role', 'service_provider').eq('service_type', serviceType);
  } else {
    const role = serviceType === 'construction_firm' ? 'construction_firm' : 'labour_contractor';
    query = query.eq('role', role);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch bidder emails:', error.message);
    return [];
  }

  const seen = new Set<string>();
  const recipients: BidderRecipient[] = [];

  for (const row of data ?? []) {
    const email = row.email?.trim();
    if (!email || !email.includes('@')) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push({
      email,
      full_name: row.full_name?.trim() || 'Bidder',
    });
  }

  return recipients;
}

/** Email all registered labour contractors or construction firms when a matching project is posted. */
export async function sendNewProjectAnnouncementEmails(
  input: NewProjectAnnouncementInput,
): Promise<void> {
  const recipients = await fetchBidderRecipients(input.serviceType);
  if (recipients.length === 0) {
    console.warn('No registered bidder emails for service type:', input.serviceType);
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://builbid.in';
  const isFirm = input.serviceType === 'construction_firm';
  const isTrade = isTradeServiceType(input.serviceType);
  const audienceLabel = isFirm
    ? 'Construction Firm'
    : isTrade
      ? getTradeLabel(input.serviceType)
      : 'Labour Contractor';
  const bidPath = isFirm
    ? `/dashboard/firm/bid/${input.projectId}`
    : `/dashboard/builder/bid/${input.projectId}`;
  const bidUrl = `${siteUrl}${bidPath}`;

  const constructionLabel = getConstructionLabel(
    input.track_type,
    input.sub_configuration ?? {},
  );
  const endsAt = new Date(input.bidding_ends_at).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `New ${audienceLabel} Project — ${input.title} (${input.district})`;
  const summary = [
    `A client posted a new ${audienceLabel.toLowerCase()} project on BuilBid.`,
    '',
    `Project: ${input.title}`,
    `Location: ${input.district}, ${input.state}`,
    `Construction: ${constructionLabel}`,
    `Bidding closes: ${endsAt}`,
  ].join('\n');

  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendUserNotificationEmail({
        to: recipient.email,
        title: subject,
        body: `Hi ${recipient.full_name},\n\n${summary}\n\nPlace your bid before the timer runs out.`,
        actionUrl: bidUrl,
        actionLabel: 'View project & bid',
      }),
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(
    `New project emails: ${recipients.length - failed}/${recipients.length} sent for project ${input.projectId} (${audienceLabel})`,
  );
}
