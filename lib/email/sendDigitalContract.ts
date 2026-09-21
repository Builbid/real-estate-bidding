import { getMailTransporter } from '@/lib/email/sendNotification';
import { getOfficialAgreementRecipients } from '@/lib/email/sendMistriAgreement';
import {
  BUILBID_CORPORATE_AGREEMENT_EMAIL,
  type DigitalContractParty,
} from '@/lib/contract/renderDigitalContract';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function summaryTable(summary: Record<string, string>): string {
  return Object.entries(summary)
    .map(
      ([label, value]) => `<tr>
      <td style="padding:8px 12px;color:#94a3b8;font-size:13px;width:190px;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;color:#f1f5f9;font-size:13px;font-weight:600">${escapeHtml(value || '—')}</td>
    </tr>`,
    )
    .join('');
}

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="color:#fff;font-size:20px;font-weight:800">BuilBid</span>
      <p style="color:#94a3b8;font-size:14px;margin:8px 0 0">Official Contract Agreement</p>
    </div>
    ${body}
    <p style="color:#475569;font-size:12px;margin:24px 0 0;text-align:center">
      Automated dispatch from BuilBid Platform
    </p>
  </div>
</body>
</html>`;
}

export async function sendDigitalContractDraftEmails(input: {
  clientEmail: string;
  contractorEmail: string;
  clientName: string;
  contractorName: string;
  clientOtp: string;
  contractorOtp: string;
  clientUrl: string;
  contractorUrl: string;
  summary: Record<string, string>;
  pdfBytes: Uint8Array;
  filename: string;
}): Promise<void> {
  const { transporter, from } = getMailTransporter();
  const attachment = {
    filename: `DRAFT-${input.filename}`,
    content: Buffer.from(input.pdfBytes),
    contentType: 'application/pdf',
  };

  async function sendParty(opts: {
    to: string;
    name: string;
    role: DigitalContractParty;
    otp: string;
    url: string;
  }) {
    const roleLabel = opts.role === 'client' ? 'Homeowner / Client' : 'Contractor / Mistri';
    const html = wrap(`
      <p style="color:#e2e8f0;font-size:14px;line-height:1.6">Dear ${escapeHtml(opts.name)},</p>
      <p style="color:#cbd5e1;font-size:14px;line-height:1.6">
        BuilBid has prepared the official contract agreement for your review. Please read the draft below
        (and the attached PDF), then complete Aadhaar eSign with the one-time OTP.
      </p>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;margin:20px 0">
        <div style="background:#0f766e;padding:10px 16px">
          <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Draft agreement preview</span>
        </div>
        <table style="width:100%;border-collapse:collapse">${summaryTable(input.summary)}</table>
      </div>
      <p style="color:#94a3b8;font-size:13px">You are signing as <strong style="color:#fff">${roleLabel}</strong>.</p>
      <div style="background:#0f172a;border:1px dashed #14b8a6;border-radius:12px;padding:16px;text-align:center;margin:16px 0">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.08em">Aadhaar eSign OTP</p>
        <p style="color:#fff;font-size:28px;font-weight:800;letter-spacing:.2em;margin:0">${escapeHtml(opts.otp)}</p>
        <p style="color:#94a3b8;font-size:12px;margin:8px 0 0">Valid for 20 minutes. Do not share this code.</p>
      </div>
      <p style="text-align:center;margin:24px 0">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">
          Review &amp; eSign Agreement
        </a>
      </p>
      <p style="color:#64748b;font-size:12px;line-height:1.5">
        If the button does not work, open: ${escapeHtml(opts.url)}
      </p>
    `);

    await transporter.sendMail({
      from,
      to: opts.to,
      subject: `Action required: Review & eSign BuilBid Contract — ${input.summary.Project ?? 'Project'}`,
      text: [
        `Dear ${opts.name},`,
        `You are signing as ${roleLabel}.`,
        ...Object.entries(input.summary).map(([k, v]) => `${k}: ${v}`),
        `Aadhaar eSign OTP: ${opts.otp}`,
        `eSign link: ${opts.url}`,
        'The draft agreement PDF is attached.',
      ].join('\n'),
      html,
      attachments: [attachment],
    });
  }

  await sendParty({
    to: input.clientEmail,
    name: input.clientName,
    role: 'client',
    otp: input.clientOtp,
    url: input.clientUrl,
  });
  await sendParty({
    to: input.contractorEmail,
    name: input.contractorName,
    role: 'contractor',
    otp: input.contractorOtp,
    url: input.contractorUrl,
  });
}

export async function sendSignedDigitalContractPdf(input: {
  clientEmail: string;
  contractorEmail: string;
  summary: Record<string, string>;
  pdfBytes: Uint8Array;
  filename: string;
}): Promise<void> {
  const { transporter, from } = getMailTransporter();
  const recipients = new Set<string>([
    input.clientEmail.toLowerCase(),
    input.contractorEmail.toLowerCase(),
    BUILBID_CORPORATE_AGREEMENT_EMAIL.toLowerCase(),
    ...getOfficialAgreementRecipients(),
  ]);

  const html = wrap(`
    <p style="color:#e2e8f0;font-size:14px;line-height:1.6">
      Both parties have completed Aadhaar eSign. The final BuilBid Contract Agreement PDF is attached.
    </p>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;margin:20px 0">
      <div style="background:#0f766e;padding:10px 16px">
        <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Signed agreement</span>
      </div>
      <table style="width:100%;border-collapse:collapse">${summaryTable(input.summary)}</table>
    </div>
    <p style="color:#5eead4;font-size:13px">Status: Digitally Signed via Aadhaar eSign</p>
  `);

  await transporter.sendMail({
    from,
    to: [...recipients],
    subject: `Final Signed Agreement — ${input.summary.Project ?? 'BuilBid Contract'}`,
    text: [
      'Both parties have completed Aadhaar eSign. The final PDF is attached.',
      ...Object.entries(input.summary).map(([k, v]) => `${k}: ${v}`),
    ].join('\n'),
    html,
    attachments: [
      {
        filename: `SIGNED-${input.filename}`,
        content: Buffer.from(input.pdfBytes),
        contentType: 'application/pdf',
      },
    ],
  });
}
