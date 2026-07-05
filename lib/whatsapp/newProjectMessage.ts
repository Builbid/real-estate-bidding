import { getConstructionLabel } from '@/lib/utils';
import type { TrackType, SubConfiguration } from '@/lib/types';
import { getAppBaseUrl } from './config';

export interface NewProjectWhatsAppPayload {
  title: string;
  district: string;
  state?: string;
  track_type: TrackType;
  sub_configuration: SubConfiguration;
  bidding_ends_at: string;
}

function formatBiddingDeadline(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Concise WhatsApp invitation template for new project alerts. */
export function buildNewProjectInvitationMessage(project: NewProjectWhatsAppPayload): string {
  const location = project.state
    ? `${project.district}, ${project.state}`
    : project.district;
  const scope = getConstructionLabel(project.track_type, project.sub_configuration);
  const biddingEnds = formatBiddingDeadline(project.bidding_ends_at);
  const dashboardUrl = `${getAppBaseUrl()}/dashboard/builder`;

  return [
    '🏗️ *New Project Invitation on BuilBid!*',
    'A new project matching your profile has been posted.',
    `• *Project Name:* ${project.title}`,
    `• *Location:* ${location}`,
    `• *Scope:* ${scope}`,
    `• *Bidding Ends:* ${biddingEnds}`,
    '',
    `👉 Log into your BuilBid dashboard to view details and place your bid before time runs out!`,
    dashboardUrl,
  ].join('\n');
}
