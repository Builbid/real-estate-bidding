import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStaffSession } from '@/lib/admin/auth';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { formatSupervisorAdminId } from '@/lib/admin/data';
import { slipFromRow } from '@/lib/admin/settlement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function rupees(value: number): string {
  // Standard PDF fonts have no rupee glyph.
  return `Rs. ${value.toLocaleString('en-IN')}`;
}

/**
 * Monthly payment receipt slip (PDF).
 *   ?id=<settlement id>            view inline
 *   ?id=<settlement id>&download=1 download
 * A supervisor can only open their own slips; the official admin can open any.
 */
export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const id = params.get('id')?.trim() ?? '';
  const download = params.get('download') === '1';
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid slip id.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('supervisor_settlements')
    .select('id, supervisor_id, slip_number, period_month, amount, commission_count, reference, paid_at')
    .eq('id', id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Slip not found.' }, { status: 404 });

  const official = isOfficialAdminEmail(session.email);
  if (!official && row.supervisor_id !== session.userId) {
    return NextResponse.json({ error: 'Not your payment slip.' }, { status: 403 });
  }

  const slip = slipFromRow(row);
  const { data: supervisor } = await admin
    .from('supervisors')
    .select('supervisor_name, phone')
    .eq('user_id', row.supervisor_id)
    .maybeSingle();

  const { data: commissions } = await admin
    .from('supervisor_commissions')
    .select('project_id, project_value, amount')
    .eq('settlement_id', id)
    .limit(200);
  const projectIds = (commissions ?? []).map((c) => c.project_id as string);
  const { data: projects } = projectIds.length
    ? await admin.from('projects').select('id, title, numeric_id').in('id', projectIds)
    : { data: [] as Array<{ id: string; title: string; numeric_id: string | null }> };
  const titleById = new Map((projects ?? []).map((p) => [p.id, p]));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const m = 18;
  let y = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BuilBid', m, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Supervisor Commission - Monthly Payment Receipt', m, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(`Slip No: ${slip.slipNumber}`, w - m, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Paid on: ${new Date(slip.paidAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}`, w - m, y + 6, { align: 'right' });
  y += 16;
  doc.line(m, y, w - m, y);
  y += 8;

  const rowsOut: Array<[string, string]> = [
    ['Supervisor', supervisor?.supervisor_name ?? 'Supervisor'],
    ['Supervisor ID', formatSupervisorAdminId(row.supervisor_id)],
    ['Settlement month', slip.periodLabel],
    ['Commission rate', '0.2% of project value'],
    ['Projects settled', String(slip.commissionCount)],
    ['Reference', slip.reference ?? '-'],
  ];
  doc.setFontSize(10);
  for (const [label, value] of rowsOut) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, m, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), m + 48, y);
    y += 7;
  }

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Projects included', m, y);
  y += 6;
  doc.setFontSize(9);
  doc.text('Project', m, y);
  doc.text('Project value', w - m - 40, y, { align: 'right' });
  doc.text('Commission', w - m, y, { align: 'right' });
  y += 2;
  doc.line(m, y, w - m, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  for (const c of commissions ?? []) {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    const project = titleById.get(c.project_id as string);
    const label = `${project?.numeric_id ? `${project.numeric_id} - ` : ''}${project?.title ?? 'Project'}`;
    doc.text(doc.splitTextToSize(label, w - m * 2 - 75)[0] as string, m, y);
    doc.text(rupees(Number(c.project_value)), w - m - 40, y, { align: 'right' });
    doc.text(rupees(Number(c.amount)), w - m, y, { align: 'right' });
    y += 6;
  }

  y += 4;
  doc.line(m, y, w - m, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total paid', m, y);
  doc.text(rupees(slip.amount), w - m, y, { align: 'right' });
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'Pending balance after this settlement: Rs. 0. This is a system-generated receipt from the BuilBid platform.',
    m,
    y,
  );

  const bytes = Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${slip.slipNumber}.pdf"`,
    },
  });
}
