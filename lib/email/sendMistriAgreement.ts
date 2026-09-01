import { getMailTransporter } from '@/lib/email/sendNotification';
import {
  BUILBID_CORP_GMAIL,
  BUILBID_OFFICIAL_AGREEMENT_EMAILS,
  generateMistriAgreementPdfBytes,
  mistriAgreementEmailSubject,
  mistriAgreementFileName,
  type MistriAgreementPayload,
} from '@/lib/contract/mistriAgreement';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOfficialAgreementHtml(payload: MistriAgreementPayload): string {
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 12px;color:#94a3b8;font-size:13px;width:180px;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;color:#f1f5f9;font-size:13px;font-weight:600">${escapeHtml(value || '—')}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="color:#fff;font-size:20px;font-weight:800">BuilBid</span>
      <p style="color:#94a3b8;font-size:14px;margin:8px 0 0">Official signed Mistri / civil work agreement</p>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;margin-bottom:20px">
      <div style="background:#0f766e;padding:10px 16px">
        <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Award summary</span>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row('Project ID', payload.projectId)}
        ${row('Project', payload.projectTitle)}
        ${row('Client name', payload.client.name)}
        ${row('Mistri name', payload.mistri.companyName || payload.mistri.name)}
        ${row('Site address', payload.siteAddress)}
        ${row('Accepted civil work rates', payload.acceptedRateLabel)}
        ${row('Built-up area', payload.slabAreaLabel)}
        ${payload.bidRows.filter((r) => !/^Built-up area/i.test(r.label)).map((r) => row(r.label, r.value)).join('')}
        ${row('Agreed start', payload.agreedStartDate)}
        ${row('Payment milestone', payload.paymentMilestoneClause)}
      </table>
    </div>
    <p style="color:#fecaca;font-size:13px;line-height:1.5;margin:0 0 16px">
      All funds must flow through the BuilBid payment gateway. Direct cash to the Mistri is prohibited and voids platform guarantees. Accepted rate is fixed. Delay beyond a 10-day grace period: 5% deduction from labour payout.
    </p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0">
      The generated PDF agreement is attached. This message is sent only to BuilBid official inboxes.
    </p>
    <p style="color:#475569;font-size:12px;margin:24px 0 0;text-align:center">
      Automated dispatch from BuilBid Platform · ${escapeHtml(payload.generatedAtLabel)}
    </p>
  </div>
</body>
</html>`;
}

function buildOfficialAgreementText(payload: MistriAgreementPayload): string {
  return [
    `Official Signed Agreement — Project #${payload.projectId} (Mistri / Civil Work)`,
    `Project: ${payload.projectTitle}`,
    `Client Name: ${payload.client.name}`,
    `Mistri Name: ${payload.mistri.companyName || payload.mistri.name}`,
    `Site Address: ${payload.siteAddress}`,
    `Accepted civil work rates: ${payload.acceptedRateLabel}`,
    `Built-up area: ${payload.slabAreaLabel}`,
    ...payload.bidRows
      .filter((row) => !/^Built-up area/i.test(row.label))
      .map((row) => `${row.label}: ${row.value}`),
    `Agreed start: ${payload.agreedStartDate}`,
    'Payment: BuilBid gateway only. Cash to Mistri is prohibited.',
    payload.paymentMilestoneClause,
    'Delay penalty: 5% after 10-day grace. Material delays by homeowner extend the deadline.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Official inboxes only — always includes builbidcorp@gmail.com and the SMTP GMAIL_USER. */
export function getOfficialAgreementRecipients(): string[] {
  const recipients = new Set<string>();
  for (const address of BUILBID_OFFICIAL_AGREEMENT_EMAILS) {
    recipients.add(address.toLowerCase());
  }
  recipients.add(BUILBID_CORP_GMAIL.toLowerCase());
  const gmailUser = process.env.GMAIL_USER?.trim();
  if (gmailUser) recipients.add(gmailUser.toLowerCase());
  return [...recipients];
}

/** Emails the signed mistri agreement PDF only to BuilBid official addresses. */
export async function sendOfficialMistriAgreementEmail(
  payload: MistriAgreementPayload,
): Promise<void> {
  const { transporter, from } = getMailTransporter();
  const pdfBytes = generateMistriAgreementPdfBytes(payload);
  const to = getOfficialAgreementRecipients();

  if (to.length === 0) {
    throw new Error('No official agreement recipients configured.');
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject: mistriAgreementEmailSubject(payload.projectId),
    text: buildOfficialAgreementText(payload),
    html: buildOfficialAgreementHtml(payload),
    attachments: [
      {
        filename: mistriAgreementFileName(payload.projectId),
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf',
      },
    ],
  });

  console.log('Official mistri agreement emailed:', info.messageId, '→', to.join(', '));
}
