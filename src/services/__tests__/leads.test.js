import { describe, expect, it, vi } from 'vitest';

// The service imports the Supabase client, which needs browser env vars.
vi.mock('@/lib/customSupabaseClient', () => ({ supabase: {} }));

const { leadMailto, newLeadId, normalizePhone, validateLead } = await import('../leads');

const form = {
  organization_name: 'บริษัท ตัวอย่าง จำกัด',
  employee_count: '250',
  address: '99 หมู่ 4 ตำบลบ้านฉาง จังหวัดระยอง',
  contact_name: 'คุณสมชาย ใจดี',
  phone: '081-234-5678',
  email: 'somchai@example.co.th',
  note: 'ต้องการติดตั้งในเครื่องของบริษัท',
};

describe('leadMailto', () => {
  const link = leadMailto(form, 'amnart.gl@gmail.com');
  const query = new URLSearchParams(link.split('?')[1]);

  it('goes to the address given and nowhere else', () => {
    expect(link.startsWith('mailto:amnart.gl@gmail.com?subject=')).toBe(true);
    expect([...query.keys()]).toEqual(['subject', 'body']);
  });

  it('carries everything the visitor typed', () => {
    expect(query.get('subject')).toBe('[HRM Suite] ลงทะเบียน: บริษัท ตัวอย่าง จำกัด');
    Object.values(form).forEach((value) => expect(query.get('body')).toContain(value));
  });

  it('cannot be made to add recipients or headers', () => {
    const hostile = leadMailto(
      { ...form, organization_name: 'x\r\nBcc: victim@example.com', note: 'a&cc=victim@example.com&bcc=other@example.com' },
      'amnart.gl@gmail.com',
    );
    const parsed = new URLSearchParams(hostile.split('?')[1]);
    expect([...parsed.keys()]).toEqual(['subject', 'body']);
    expect(parsed.get('subject')).not.toMatch(/[\r\n]/);
    expect(hostile.split('?')[0]).toBe('mailto:amnart.gl@gmail.com');
  });

  it('copes with an empty form', () => {
    const empty = new URLSearchParams(leadMailto({}, 'amnart.gl@gmail.com').split('?')[1]);
    expect(empty.get('body')).toContain('องค์กร: -');
  });
});

describe('newLeadId', () => {
  it('makes a different version 4 UUID each time', () => {
    const a = newLeadId();
    const b = newLeadId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});

describe('validateLead and normalizePhone', () => {
  it('accepts a complete form', () => {
    expect(validateLead(form)).toEqual({});
    expect(normalizePhone('081-234-5678')).toBe('+66812345678');
  });

  it('reports each field that is wrong', () => {
    expect(Object.keys(validateLead({ ...form, organization_name: 'x', employee_count: '0', phone: '12', email: 'nope' })).sort())
      .toEqual(['email', 'employee_count', 'organization_name', 'phone']);
  });
});
