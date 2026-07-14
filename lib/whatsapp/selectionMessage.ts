import { getAppBaseUrl } from './config';

export interface SelectionWhatsAppPayload {
  recipientName: string;
  isFirmProject: boolean;
  projectTitle: string;
  district: string;
  constructionType: string;
  bidAmount: string | null;
  clientName: string;
  recipientRole?: 'labour_contractor' | 'construction_firm' | string;
}

function dashboardUrlForRole(role?: string): string {
  const base = getAppBaseUrl();
  if (role === 'construction_firm') return `${base}/dashboard/firm`;
  return `${base}/dashboard/builder`;
}

/** WhatsApp message sent to the selected builder or construction firm. */
export function buildSelectionCongratulationsMessage(
  payload: SelectionWhatsAppPayload,
): string {
  const location = payload.district;
  const dashboardUrl = dashboardUrlForRole(payload.recipientRole);
  const headline = payload.isFirmProject
    ? '🎉 *You\'ve been selected on BuilBid!*'
    : '🎉 *Congratulations — you\'ve been selected on BuilBid!*';

  const lines = [
    headline,
    '',
    `*Project:* ${payload.projectTitle}`,
    `*Location:* ${location}`,
    `*Scope:* ${payload.constructionType}`,
  ];

  if (payload.bidAmount) {
    lines.push(`*Your bid:* ${payload.bidAmount}`);
  }

  lines.push(
    '',
    payload.isFirmProject
      ? 'Our team will reach out to coordinate the construction agreement.'
      : `${payload.clientName} has selected you for this project. Our team will reach out shortly.`,
    '',
    `👉 View details: ${dashboardUrl}`,
    '',
    '— Team BuilBid',
  );

  return lines.join('\n');
}
