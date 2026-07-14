import { getAppBaseUrl } from '@/lib/whatsapp/config';

export interface SelectionSmsPayload {
  isFirmProject: boolean;
  projectTitle: string;
  district: string;
  constructionType: string;
  bidAmount: string | null;
  clientName: string;
  recipientRole?: string;
}

function dashboardUrlForRole(role?: string): string {
  const base = getAppBaseUrl();
  if (role === 'construction_firm') return `${base}/dashboard/firm`;
  return `${base}/dashboard/builder`;
}

/** Plain-text SMS for selection alerts (no WhatsApp formatting). */
export function buildSelectionSmsMessage(payload: SelectionSmsPayload): string {
  const lines = [
    payload.isFirmProject
      ? 'You have been selected on BuilBid!'
      : 'Congratulations! You have been selected on BuilBid.',
    '',
    `Project: ${payload.projectTitle}`,
    `Location: ${payload.district}`,
    `Scope: ${payload.constructionType}`,
  ];

  if (payload.bidAmount) {
    lines.push(`Your bid: ${payload.bidAmount}`);
  }

  lines.push(
    '',
    payload.isFirmProject
      ? 'Our team will reach out to coordinate next steps.'
      : `${payload.clientName} selected you. Our team will reach out shortly.`,
    '',
    `Dashboard: ${dashboardUrlForRole(payload.recipientRole)}`,
    '- Team BuilBid',
  );

  return lines.join('\n');
}
