import { describe, expect, it } from 'vitest';
import {
  MAX_ATTEMPTS, NOTIFY_WINDOW_MINUTES, bangkokTime, buildEmail, escapeHtml, isUuid, refusal, singleLine, type Lead,
} from '../message';

const lead: Lead = {
  id: '3f2b8c1e-5d4a-4b6f-9a1c-2e7d8f0a1b2c',
  organization_name: 'บริษัท ตัวอย่าง จำกัด',
  employee_count: 1250,
  address: '99 หมู่ 4 ตำบลบ้านฉาง\nจังหวัดระยอง',
  contact_name: 'คุณสมชาย ใจดี',
  phone: '+66812345678',
  email: 'somchai@example.co.th',
  note: 'ต้องการติดตั้งในเครื่องของบริษัท',
  source: 'landing',
  created_at: '2026-09-29T07:05:00Z',
};

describe('isUuid', () => {
  it('accepts a UUID and nothing else', () => {
    expect(isUuid(lead.id)).toBe(true);
    expect(isUuid('3f2b8c1e-5d4a-4b6f-9a1c')).toBe(false);
    expect(isUuid("' or 1=1 --")).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe('escapeHtml and singleLine', () => {
  it('neutralises markup', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(escapeHtml(null)).toBe('');
  });

  it('removes line breaks that could add email headers', () => {
    expect(singleLine('a@b.co\r\nBcc: victim@example.com')).toBe('a@b.co Bcc: victim@example.com');
    expect(singleLine('  ชื่อ\n\nบริษัท  ')).toBe('ชื่อ บริษัท');
  });
});

describe('bangkokTime', () => {
  it('shows Thai clock time', () => {
    expect(bangkokTime('2026-09-29T07:05:00Z')).toBe('29/09/2026 14:05');
    expect(bangkokTime('2026-12-31T18:30:00Z')).toBe('01/01/2027 01:30');
  });
});

describe('refusal', () => {
  const now = new Date('2026-09-29T07:10:00Z');
  const fresh = { created_at: '2026-09-29T07:05:00Z', notified_at: null, notify_attempts: 0 };

  it('allows a fresh registration', () => {
    expect(refusal(fresh, now)).toBeNull();
  });

  it('sends once only', () => {
    expect(refusal({ ...fresh, notified_at: '2026-09-29T07:06:00Z' }, now)).toBe('already_notified');
  });

  it('stops after the allowed attempts', () => {
    expect(refusal({ ...fresh, notify_attempts: MAX_ATTEMPTS - 1 }, now)).toBeNull();
    expect(refusal({ ...fresh, notify_attempts: MAX_ATTEMPTS }, now)).toBe('too_many_attempts');
  });

  it('refuses old registrations, so stored rows cannot be replayed into the mailbox', () => {
    const old = new Date(now.getTime() - (NOTIFY_WINDOW_MINUTES + 1) * 60000).toISOString();
    expect(refusal({ ...fresh, created_at: old }, now)).toBe('too_old');
    expect(refusal({ ...fresh, created_at: '2026-09-30T07:05:00Z' }, now)).toBe('too_old');
    expect(refusal({ ...fresh, created_at: 'not a date' }, now)).toBe('too_old');
  });
});

describe('buildEmail', () => {
  const email = buildEmail(lead);

  it('puts the organization and headcount in the subject', () => {
    expect(email.subject).toBe('[HRM Suite] ลงทะเบียนใหม่: บริษัท ตัวอย่าง จำกัด (1250 คน)');
  });

  it('carries every field in the text', () => {
    ['บริษัท ตัวอย่าง จำกัด', '1,250 คน', 'คุณสมชาย ใจดี', '+66812345678', 'somchai@example.co.th', 'ตำบลบ้านฉาง', 'ต้องการติดตั้งในเครื่องของบริษัท', '29/09/2026 14:05 น.', lead.id]
      .forEach((value) => expect(email.text).toContain(value));
  });

  it('replies go to the person who registered', () => {
    expect(email.replyTo).toBe('somchai@example.co.th');
  });

  it('shows a dash when there is no message', () => {
    expect(buildEmail({ ...lead, note: null }).text).toContain('ข้อความ: -');
  });

  it('escapes what the visitor typed', () => {
    const hostile = buildEmail({
      ...lead,
      organization_name: '<script>alert(1)</script>',
      note: '"><a href="https://evil.example">กดที่นี่</a>',
    });
    expect(hostile.html).not.toContain('<script>');
    expect(hostile.html).not.toContain('<a href="https://evil.example">');
    expect(hostile.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('keeps the subject on one line and within a sensible length', () => {
    const hostile = buildEmail({ ...lead, organization_name: `บริษัท\r\nBcc: x@example.com ${'ก'.repeat(400)}` });
    expect(hostile.subject).not.toMatch(/[\r\n]/);
    expect(hostile.subject.length).toBeLessThanOrEqual(200);
    expect(buildEmail({ ...lead, email: 'a@b.co\nBcc: x@example.com' }).replyTo).not.toMatch(/[\r\n]/);
  });
});
