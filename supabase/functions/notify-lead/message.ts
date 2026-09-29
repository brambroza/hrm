/**
 * @file Builds the email that tells the sales mailbox about a registration.
 * Pure: no network, no Deno API, so it can be tested anywhere.
 */

export interface Lead {
  id: string;
  organization_name: string;
  employee_count: number;
  address: string;
  contact_name: string;
  phone: string;
  email: string;
  note: string | null;
  source: string;
  created_at: string;
}

export interface Email {
  subject: string;
  text: string;
  html: string;
  replyTo: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** How long after a registration a notification may still be requested. */
export const NOTIFY_WINDOW_MINUTES = 15;
/** Attempts allowed per registration. */
export const MAX_ATTEMPTS = 3;

/**
 * Whether a value is a version 1 to 5 UUID.
 * @param value - Candidate id.
 * @returns True for a well-formed UUID.
 */
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

/**
 * Escape text for use in HTML. Everything in the email comes from a public
 * form, so every value goes through this.
 * @param value - Text typed by a visitor.
 * @returns Text safe to place in markup.
 */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Remove line breaks and control characters, so a value cannot add headers to
 * the email when it is used in the subject or the reply address.
 * @param value - Text typed by a visitor.
 * @returns One line of text.
 */
export const singleLine = (value: unknown): string =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Date and time as read on a clock in Thailand.
 * @param iso - Timestamp.
 * @returns Text such as `29/09/2026 14:05`.
 */
export const bangkokTime = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(',', '');

/**
 * Whether a notification may be sent for a registration.
 * @param lead - Fields that decide it.
 * @param now - Current time.
 * @returns Why not, or null when sending is allowed.
 */
export const refusal = (
  lead: { created_at: string; notified_at: string | null; notify_attempts: number },
  now: Date,
): 'already_notified' | 'too_old' | 'too_many_attempts' | null => {
  if (lead.notified_at) return 'already_notified';
  if (lead.notify_attempts >= MAX_ATTEMPTS) return 'too_many_attempts';
  const ageMinutes = (now.getTime() - new Date(lead.created_at).getTime()) / 60000;
  if (!Number.isFinite(ageMinutes) || ageMinutes > NOTIFY_WINDOW_MINUTES || ageMinutes < -1) return 'too_old';
  return null;
};

/**
 * Build the notification email.
 * @param lead - The registration.
 * @returns Subject, plain text, HTML and the address a reply should go to.
 */
export const buildEmail = (lead: Lead): Email => {
  const rows: [string, string][] = [
    ['องค์กร', lead.organization_name],
    ['จำนวนพนักงาน', `${lead.employee_count.toLocaleString('en-US')} คน`],
    ['ผู้ติดต่อ', lead.contact_name],
    ['โทรศัพท์', lead.phone],
    ['อีเมล', lead.email],
    ['ที่อยู่', lead.address],
    ['ข้อความ', lead.note || '-'],
    ['ลงทะเบียนเมื่อ', `${bangkokTime(lead.created_at)} น.`],
    ['ช่องทาง', lead.source],
    ['รหัสอ้างอิง', lead.id],
  ];

  const subject = singleLine(`[HRM Suite] ลงทะเบียนใหม่: ${lead.organization_name} (${lead.employee_count} คน)`).slice(0, 200);

  const text = [
    'มีผู้ลงทะเบียนรับการติดต่อกลับจากหน้าเว็บ HRM Suite',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'กดตอบกลับอีเมลนี้เพื่อตอบผู้ลงทะเบียนโดยตรง',
  ].join('\n');

  const html = `<!doctype html>
<html lang="th">
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Tahoma,'Segoe UI',sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="padding:24px 24px 8px">
<p style="margin:0;font-size:13px;color:#047857;font-weight:bold">HRM Suite</p>
<h1 style="margin:4px 0 0;font-size:20px;line-height:1.4">มีผู้ลงทะเบียนรับการติดต่อกลับ</h1>
</td></tr>
<tr><td style="padding:8px 24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6">
${rows
  .map(
    ([label, value]) =>
      `<tr><th align="left" valign="top" style="padding:8px 12px 8px 0;width:130px;color:#475569;font-weight:normal;border-top:1px solid #f1f5f9">${escapeHtml(label)}</th><td valign="top" style="padding:8px 0;border-top:1px solid #f1f5f9;white-space:pre-wrap;word-break:break-word">${escapeHtml(value)}</td></tr>`,
  )
  .join('\n')}
</table>
</td></tr>
<tr><td style="padding:0 24px 24px;font-size:13px;color:#475569">กดตอบกลับอีเมลนี้เพื่อตอบผู้ลงทะเบียนโดยตรง</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html, replyTo: singleLine(lead.email) };
};
