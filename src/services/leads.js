import { supabase } from '@/lib/customSupabaseClient';

/** Field-level limits; mirror the CHECK constraints in 0005_leads.sql. */
const PHONE_RE = /^\+?[0-9]{8,15}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Normalise a Thai phone number: strip spaces/dashes and convert a leading
 * "0" to "+66" so the value passes the DB constraint and is dialable.
 * @param {string} raw
 * @returns {string}
 */
export const normalizePhone = (raw) => {
  const digits = String(raw || '').replace(/[\s\-().]/g, '');
  if (/^0[0-9]{8,9}$/.test(digits)) return `+66${digits.slice(1)}`;
  return digits;
};

/**
 * Validate a lead form. Returns a map of field -> message key; empty when valid.
 * @param {object} form
 * @returns {Record<string, string>}
 */
export const validateLead = (form) => {
  const errors = {};
  const name = (form.organization_name || '').trim();
  const count = Number(form.employee_count);
  const address = (form.address || '').trim();
  const contact = (form.contact_name || '').trim();
  const phone = normalizePhone(form.phone);
  const email = (form.email || '').trim();

  if (name.length < 2 || name.length > 200) errors.organization_name = 'กรุณากรอกชื่อองค์กร (2-200 ตัวอักษร)';
  if (!Number.isInteger(count) || count < 1 || count > 100000) errors.employee_count = 'กรุณากรอกจำนวนพนักงานเป็นตัวเลข 1-100,000';
  if (address.length < 5 || address.length > 1000) errors.address = 'กรุณากรอกที่อยู่ (อย่างน้อย 5 ตัวอักษร)';
  if (contact.length < 2 || contact.length > 200) errors.contact_name = 'กรุณากรอกชื่อผู้ติดต่อ';
  if (!PHONE_RE.test(phone)) errors.phone = 'เบอร์โทรไม่ถูกต้อง เช่น 0812345678';
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'อีเมลไม่ถูกต้อง';
  if (form.note && form.note.length > 2000) errors.note = 'ข้อความยาวเกิน 2,000 ตัวอักษร';

  return errors;
};

/**
 * A link that opens the visitor's mail program with the registration already
 * written. Offered when saving fails, so what the visitor typed is not lost
 * and still reaches the sales mailbox.
 *
 * @param {object} form - Raw form values.
 * @param {string} to - Address the message goes to.
 * @returns {string} A `mailto:` address.
 */
export const leadMailto = (form, to) => {
  const line = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim() || '-';
  const subject = `[GoAlong HR] ลงทะเบียน: ${line(form.organization_name)}`.slice(0, 150);
  const body = [
    'ขอรับการติดต่อกลับเรื่อง GoAlong HR',
    '',
    `องค์กร: ${line(form.organization_name)}`,
    `จำนวนพนักงาน: ${line(form.employee_count)}`,
    `ผู้ติดต่อ: ${line(form.contact_name)}`,
    `โทรศัพท์: ${line(form.phone)}`,
    `อีเมล: ${line(form.email)}`,
    `ที่อยู่: ${line(form.address)}`,
    `ข้อความ: ${line(form.note)}`,
  ].join('\r\n');
  // The address is fixed by the site; only the subject and body carry what was typed, both encoded.
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/**
 * A new id for a registration. The form cannot read the table back, so the id
 * is made here and sent with the row; it is what the notification is asked for.
 * @returns {string} A version 4 UUID.
 */
export const newLeadId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const leadService = {
  /**
   * Submit a call-back request from the public landing page, then ask for the
   * sales mailbox to be told.
   *
   * The registration is what matters: once it is saved the visitor is told it
   * worked, whether or not the email could be sent. A registration without an
   * email is still in the table; an email without a registration would be lost.
   *
   * @param {object} form  raw form values
   * @returns {Promise<{id: string, notified: boolean}>} The id saved and whether the email was accepted.
   * @throws {Error} when validation fails or the insert is rejected
   */
  submit: async (form) => {
    const errors = validateLead(form);
    if (Object.keys(errors).length) {
      const err = new Error('validation');
      err.fields = errors;
      throw err;
    }

    const id = newLeadId();
    const { error } = await supabase.from('leads').insert({
      id,
      organization_name: form.organization_name.trim(),
      employee_count: Number(form.employee_count),
      address: form.address.trim(),
      contact_name: form.contact_name.trim(),
      phone: normalizePhone(form.phone),
      email: form.email.trim().toLowerCase(),
      note: form.note?.trim() || null,
      source: 'landing',
    });
    if (error) throw error;

    let notified = false;
    try {
      const { data, error: notifyError } = await supabase.functions.invoke('notify-lead', { body: { id } });
      notified = !notifyError && data?.sent === true;
      if (!notified) console.error('Lead saved, but the notification email was not sent.');
    } catch (notifyFailure) {
      console.error('Lead saved, but the notification email was not sent.', notifyFailure);
    }

    return { id, notified };
  },
};
