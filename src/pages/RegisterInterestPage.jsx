import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Building2, Check, Loader2, Mail, MapPin, Phone, User, Users } from 'lucide-react';
import { CONTACT } from '@/components/landing/site';
import { leadMailto, leadService } from '@/services/leads';

const INITIAL = {
  organization_name: '',
  employee_count: '',
  address: '',
  contact_name: '',
  phone: '',
  email: '',
  note: '',
};

const FIELDS = [
  { name: 'organization_name', label: 'ชื่อองค์กร', icon: Building2, placeholder: 'บริษัท ตัวอย่าง จำกัด', required: true },
  { name: 'employee_count', label: 'จำนวนพนักงาน', icon: Users, placeholder: '50', type: 'number', min: 1, required: true },
  { name: 'contact_name', label: 'ชื่อผู้ติดต่อ', icon: User, placeholder: 'คุณสมชาย ใจดี', required: true },
  { name: 'phone', label: 'เบอร์โทร', icon: Phone, placeholder: '0812345678', type: 'tel', required: true },
  { name: 'email', label: 'อีเมล', icon: Mail, placeholder: 'you@company.com', type: 'email', required: true },
];

const INPUT_CLASS =
  'w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all';

/**
 * Public "register your interest" form. Collects organization and contact
 * details so the sales team can call back. No login required.
 */
const RegisterInterestPage = () => {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  /** Update one field and clear its error. */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  /** Validate client-side, then insert into `leads`. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSubmitting(true);
    try {
      await leadService.submit(form);
      setDone(true);
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
      } else {
        console.error('Lead submit failed:', err);
        setServerError('ระบบบันทึกข้อมูลไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ครบ เลือกส่งทางอีเมลหรือโทรหาเราได้เลย');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const border = (name) => (errors[name] ? 'border-red-400' : 'border-slate-200');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5 py-10">
      <Helmet>
        <title>ลงทะเบียนรับการติดต่อกลับ | GoAlong HR</title>
        <meta name="description" content="ลงทะเบียนความสนใจ ให้ทีมงานติดต่อกลับเพื่อสาธิตระบบ GoAlong HR ด้วยข้อมูลจริงขององค์กรคุณ" />
      </Helmet>

      <div className="mx-auto max-w-xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> กลับหน้าแรก
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          {done ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold text-slate-900">ได้รับข้อมูลแล้ว ขอบคุณครับ</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                ทีมงานจะติดต่อกลับภายใน 2 ชั่วโมงทำการ (จ-ศ 09:00-18:00)
                ทางเบอร์ {form.phone} หรืออีเมล {form.email}
              </p>
              <Link
                to="/"
                className="mt-8 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-medium text-slate-900 transition-transform hover:scale-105"
              >
                กลับหน้าแรก
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">ลงทะเบียนรับการติดต่อกลับ</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                กรอกข้อมูลองค์กรและผู้ติดต่อ ทีมงานจะโทรกลับเพื่อนัดสาธิตระบบด้วยข้อมูลจริงของคุณ ไม่มีค่าใช้จ่าย ไม่ผูกมัด
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
                {FIELDS.map(({ name, label, icon: Icon, placeholder, type = 'text', min, required }) => (
                  <div key={name}>
                    <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
                      {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id={name}
                        name={name}
                        type={type}
                        min={min}
                        value={form[name]}
                        onChange={handleChange}
                        placeholder={placeholder}
                        required={required}
                        maxLength={254}
                        aria-invalid={Boolean(errors[name])}
                        className={`${INPUT_CLASS} ${border(name)}`}
                      />
                    </div>
                    {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name]}</p>}
                  </div>
                ))}

                <div>
                  <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">
                    ที่อยู่ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={form.address}
                      onChange={handleChange}
                      placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      required
                      maxLength={1000}
                      aria-invalid={Boolean(errors.address)}
                      className={`${INPUT_CLASS} ${border('address')}`}
                    />
                  </div>
                  {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
                </div>

                <div>
                  <label htmlFor="note" className="mb-1.5 block text-sm font-medium text-slate-700">
                    สิ่งที่อยากให้ช่วย (ไม่บังคับ)
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    value={form.note}
                    onChange={handleChange}
                    placeholder="เช่น มีกะกลางคืน คำนวณ OT ซับซ้อน ใช้เครื่องสแกนนิ้วยี่ห้อ..."
                    maxLength={2000}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${border('note')}`}
                  />
                  {errors.note && <p className="mt-1 text-xs text-red-500">{errors.note}</p>}
                </div>

                {serverError && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
                    <p>{serverError}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <a
                        href={leadMailto(form, CONTACT.personalEmail)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white px-4 font-medium text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" /> ส่งทางอีเมลแทน
                      </a>
                      <a
                        href={CONTACT.phoneHref}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white px-4 font-medium text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50"
                      >
                        <Phone className="h-4 w-4" aria-hidden="true" /> โทร {CONTACT.phoneLabel}
                      </a>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-medium text-slate-900 shadow-lg shadow-emerald-600/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'กำลังส่ง...' : 'ส่งข้อมูล'}
                </button>

                <p className="text-center text-xs text-slate-400">
                  ข้อมูลใช้เพื่อติดต่อกลับเท่านั้น ไม่ส่งต่อบุคคลที่สาม · หรือโทร {CONTACT.phoneLabel}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterInterestPage;
