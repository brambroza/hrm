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

export const leadService = {
  /**
   * Submit a call-back request from the public landing page.
   * The table is insert-only for anonymous users, so nothing is returned.
   * @param {object} form  raw form values
   * @throws {Error} when validation fails or the insert is rejected
   */
  submit: async (form) => {
    const errors = validateLead(form);
    if (Object.keys(errors).length) {
      const err = new Error('validation');
      err.fields = errors;
      throw err;
    }

    const { error } = await supabase.from('leads').insert({
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
  },
};
