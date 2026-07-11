import nodemailer from 'nodemailer';

interface SelectionEmailData {
  projectTitle:       string;
  projectDistrict:    string;
  constructionType:   string;
  bidAmount:          number;
  isFirmProject?:     boolean;

  ownerName:    string;
  ownerEmail:   string;
  ownerMobile:  string | null;
  ownerAddress: string | null;

  builderName:    string;
  builderEmail:   string;
  builderMobile:  string | null;
  builderAddress: string | null;
}

function buildHtml(d: SelectionEmailData): string {
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 12px;color:#94a3b8;font-size:13px;width:140px;vertical-align:top">${label}</td>
      <td style="padding:8px 12px;color:#f1f5f9;font-size:13px;font-weight:600">${value || '—'}</td>
    </tr>`;

  const section = (title: string, color: string, rows: string) =>
    `<div style="margin-bottom:24px">
      <div style="background:${color};border-radius:8px 8px 0 0;padding:10px 16px">
        <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">${title}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:0 0 8px 8px;overflow:hidden">
        ${rows}
      </table>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:36px;height:36px;background:#7c3aed;border-radius:8px;display:inline-flex;align-items:center;justify-content:center">
          <span style="color:#fff;font-size:18px">🏗</span>
        </div>
        <span style="color:#fff;font-size:20px;font-weight:800">BuilBid</span>
      </div>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 6px">${d.isFirmProject ? 'Construction Firm Selected ✅' : 'Builder Selected ✅'}</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0">${d.isFirmProject
        ? 'Congratulations! A construction firm has been selected on BuilBid.'
        : 'A client has selected a builder on BuilBid Platform'}</p>
    </div>

    <!-- Project -->
    ${section('Project Details', '#7c3aed',
      row('Project', d.projectTitle) +
      row('District', d.projectDistrict) +
      row('Construction Type', d.constructionType) +
      row('Winning Bid', `₹${d.bidAmount.toLocaleString('en-IN')} / sqft`) +
      row('Selected At', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }))
    )}

    <!-- Owner -->
    ${section('Client', '#0f766e',
      row('Name', d.ownerName) +
      row('Email', d.ownerEmail) +
      row('Mobile', d.ownerMobile ?? '—') +
      row('Address', d.ownerAddress ?? '—')
    )}

    <!-- Builder -->
    ${section(d.isFirmProject ? 'Selected Construction Firm' : 'Selected Builder', '#b45309',
      row('Name', d.builderName) +
      row('Email', d.builderEmail) +
      row('Mobile', d.builderMobile ?? '—') +
      row('Address', d.builderAddress ?? '—')
    )}

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #1e293b">
      <p style="color:#475569;font-size:12px;margin:0">
        This is an automated notification from BuilBid Platform<br/>
        © 2026 BuilBid. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendSelectionNotification(data: SelectionEmailData): Promise<void> {
  const gmailUser = process.env.GMAIL_USER?.trim();
  // Gmail app passwords are often copied with spaces — strip them
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (!gmailUser || !gmailPass) {
    throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not set on the server.');
  }

  const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,
    secure: true,
    auth:   { user: gmailUser, pass: gmailPass },
  });

  const info = await transporter.sendMail({
    from:    `"BuilBid Platform" <${gmailUser}>`,
    to:      gmailUser,
    subject: data.isFirmProject
      ? `Construction Firm Selected — ${data.projectTitle} (${data.projectDistrict})`
      : `Builder Selected — ${data.projectTitle} (${data.projectDistrict})`,
    html:    buildHtml(data),
  });

  console.log('Selection email sent:', info.messageId);
}
