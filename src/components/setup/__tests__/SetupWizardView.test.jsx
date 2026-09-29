import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import SetupWizardView, { SCREENS } from '../SetupWizardView';
import { buildSetupPlan, formFromRecords, validateStep } from '@/lib/setup/setupPlan';

// Without an i18n instance the hook returns the key, which is what the assertions look for.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key) }),
}));

const records = {
  organization: { id: 'o', name: 'บริษัท ตัวอย่าง จำกัด', tax_id: '', address: '', phone: '', email: '' },
  settings: null,
  shifts: [],
  weekOffs: [],
  policy: null,
  holidays: [{ id: 'h', holiday_date: '2026-01-01', name: 'วันขึ้นปีใหม่' }],
  departments: [{ id: 'd', name: 'ผลิต 1' }],
};

/** Render one screen of the wizard. */
const render = (screen, overrides = {}) => {
  const form = overrides.form || formFromRecords(records, 2026);
  return renderToStaticMarkup(
    <MemoryRouter>
      <SetupWizardView
        form={form}
        records={records}
        plan={buildSetupPlan(form, records)}
        screen={screen}
        errors={overrides.errors || {}}
        year={2026}
        saving={false}
        results={overrides.results || null}
        onField={() => {}}
        onNext={() => {}}
        onGoTo={() => {}}
        onSave={() => {}}
      />
    </MemoryRouter>,
  );
};

describe('SetupWizardView', () => {
  it('has six steps and a review', () => {
    expect(SCREENS).toEqual(['company', 'workHours', 'policy', 'holidays', 'departments', 'payroll', 'review']);
  });

  it.each(SCREENS)('renders the %s screen', (screen) => {
    const html = render(screen);
    expect(html).toContain(`setup.heading.${screen}`);
    expect(html).toContain('aria-current="step"');
  });

  it('shows stored values instead of asking again', () => {
    expect(render('company')).toContain('บริษัท ตัวอย่าง จำกัด');
    expect(render('holidays')).toContain('วันขึ้นปีใหม่');
    expect(render('departments')).toContain('ผลิต 1');
  });

  it('tells the user what working hours also set', () => {
    const html = render('workHours');
    expect(html).toContain('setup.alsoChanges');
    expect(html).toContain('setup.workHours.effectShift');
    // Monday to Friday by default, so Saturday and Sunday are days off.
    expect(html).toContain('setup.workHours.effectDaysOff');
    expect(html).not.toContain('setup.workHours.effectOvernight');
  });

  it('points out an overnight shift', () => {
    const form = formFromRecords(records, 2026);
    form.workHours = { ...form.workHours, work_start_time: '22:00', work_end_time: '06:00', lunch_break_start: '', lunch_break_end: '' };
    expect(render('workHours', { form })).toContain('setup.workHours.effectOvernight');
  });

  it('shows errors next to their fields', () => {
    const form = formFromRecords(records, 2026);
    form.company.name = '';
    const html = render('company', { form, errors: validateStep('company', form) });
    expect(html).toContain('role="alert"');
    expect(html).toContain('setup.errors.required');
  });

  it('only offers the bank field for bank transfer', () => {
    expect(render('payroll')).toContain('setup.payroll.bank');
    const form = formFromRecords(records, 2026);
    form.payroll.payment_method = 'cash';
    expect(render('payroll', { form })).not.toContain('setup.payroll.bank');
  });

  it('keeps stored departments read-only and new ones editable', () => {
    const form = formFromRecords(records, 2026);
    form.departments.names = ['ผลิต 1', 'คลังสินค้า'];
    const html = render('departments', { form });
    expect(html.match(/readOnly=""/g) || html.match(/readonly=""/g)).toHaveLength(1);
  });

  it('review lists what saving will change and offers Save', () => {
    const html = render('review');
    expect(html).toContain('setup.plan.shiftCreate');
    expect(html).toContain('setup.plan.weekOffs');
    expect(html).toContain('setup.save');
    expect(html).not.toContain('setup.next');
  });

  it('review reports each section after a save, and offers a retry on failure', () => {
    const html = render('review', {
      results: [
        { section: 'company', ok: true },
        { section: 'holidays', ok: false, message: 'ไม่มีสิทธิ์บันทึกส่วนนี้' },
      ],
    });
    expect(html).toContain('setup.review.done');
    expect(html).toContain('ไม่มีสิทธิ์บันทึกส่วนนี้');
    expect(html).toContain('setup.saveAgain');
  });

  it('Back is disabled on the first step', () => {
    expect(render('company')).toMatch(/<button[^>]*disabled=""[^>]*>.*?setup\.back/s);
  });
});
