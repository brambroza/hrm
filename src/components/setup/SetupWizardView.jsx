import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_SHIFT_NAME, OT_METHODS, OT_ROUNDINGS, PAYMENT_METHODS, SETUP_STEPS, WEEKDAYS,
  breakMinutes, describePlan, weeklyDaysOff,
} from '@/lib/setup/setupPlan';
import { fixedHolidaysForYear } from '@/lib/setup/thaiHolidays';
import { clockMinutesBetween } from '@/lib/requests';

/** The review screen comes after the last form step. */
export const REVIEW = 'review';
export const SCREENS = [...SETUP_STEPS, REVIEW];

const inputClass =
  'w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * A labelled form control with its error underneath.
 * @param {{id: string, label: string, hint?: string, error?: string, required?: boolean, children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
const Field = ({ id, label, hint, error, required, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}{required && ' *'}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    {error && <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
  </div>
);

/**
 * A box that tells the user what else changes because of this step.
 * @param {{title: string, lines: string[]}} props
 * @returns {JSX.Element}
 */
const AlsoChanges = ({ title, lines }) => (
  <div className="rounded-xl border border-emerald-300 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 p-4">
    <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">{title}</div>
    <ul className="mt-2 space-y-1">
      {lines.map((line) => (
        <li key={line} className="flex items-start gap-2 text-sm text-emerald-900 dark:text-emerald-200">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {line}
        </li>
      ))}
    </ul>
  </div>
);

/**
 * The guided setup as it appears on screen. Holds no state and reads nothing:
 * the page gives it the form and is told what the user did.
 *
 * @param {object} props
 * @param {object} props.form - Answers so far.
 * @param {object} props.records - Stored records the form was built from.
 * @param {object|null} props.plan - What saving would change.
 * @param {string} props.screen - Step being shown.
 * @param {object} props.errors - Message keys by field for the step being shown.
 * @param {number} props.year - Gregorian year whose holidays are edited.
 * @param {boolean} props.saving - True while the save is running.
 * @param {Array<{section: string, ok: boolean, message?: string}>|null} props.results - Outcome of the last save.
 * @param {(step: string, field: string, value: *) => void} props.onField - A field changed.
 * @param {() => void} props.onNext - Next was pressed.
 * @param {(screen: string) => void} props.onGoTo - A step was chosen.
 * @param {() => void} props.onSave - Save was pressed.
 * @returns {JSX.Element}
 */
const SetupWizardView = ({ form, records, plan, screen, errors, year, saving, results, onField, onNext, onGoTo, onSave }) => {
  const { t } = useTranslation();
  const index = SCREENS.indexOf(screen);
  const setField = onField;
  const goTo = onGoTo;
  const goNext = onNext;
  const save = onSave;

  const err = (field) => (errors[field] ? t(errors[field]) : undefined);
  const hours = form.workHours;
  const daysOff = weeklyDaysOff(hours.working_days);
  const shiftMinutes = clockMinutesBetween(hours.work_start_time, hours.work_end_time);
  const workedMinutes = Math.max(0, shiftMinutes - breakMinutes(hours));
  const overnight = hours.work_end_time && hours.work_start_time && hours.work_end_time < hours.work_start_time;

  return (
    <>

      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">{t('setup.title')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('setup.subtitle')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <nav aria-label={t('setup.steps')} className="min-w-0 lg:col-span-1">
            <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {SCREENS.map((item, i) => {
                const current = item === screen;
                const passed = i < index;
                return (
                  <li key={item} className="shrink-0">
                    <button
                      type="button"
                      aria-current={current ? 'step' : undefined}
                      onClick={() => goTo(item)}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        current
                          ? 'border-slate-900 bg-slate-900 font-medium text-white dark:border-white dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                          passed ? 'bg-emerald-700 text-white' : current ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {passed ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                      </span>
                      {t(`setup.step.${item}`)}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="min-w-0 space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:col-span-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t(`setup.heading.${screen}`)}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t(`setup.intro.${screen}`)}</p>
            </div>

            {screen === 'company' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field id="company_name" label={t('setup.company.name')} error={err('name')} required>
                    <input id="company_name" className={inputClass} maxLength={200} value={form.company.name} onChange={(e) => setField('company', 'name', e.target.value)} />
                  </Field>
                </div>
                <Field id="company_tax" label={t('setup.company.taxId')} hint={t('setup.company.taxIdHint')} error={err('tax_id')}>
                  <input id="company_tax" className={inputClass} inputMode="numeric" maxLength={17} value={form.company.tax_id} onChange={(e) => setField('company', 'tax_id', e.target.value)} />
                </Field>
                <Field id="company_phone" label={t('setup.company.phone')} error={err('phone')}>
                  <input id="company_phone" className={inputClass} type="tel" maxLength={15} value={form.company.phone} onChange={(e) => setField('company', 'phone', e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field id="company_email" label={t('setup.company.email')} error={err('email')}>
                    <input id="company_email" className={inputClass} type="email" maxLength={254} value={form.company.email} onChange={(e) => setField('company', 'email', e.target.value)} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field id="company_address" label={t('setup.company.address')} hint={t('setup.company.addressHint')}>
                    <textarea id="company_address" className={inputClass} rows={3} maxLength={500} value={form.company.address} onChange={(e) => setField('company', 'address', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {screen === 'workHours' && (
              <div className="space-y-5">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('setup.workHours.days')} *</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...WEEKDAYS.slice(1), WEEKDAYS[0]].map((day) => {
                      const on = hours.working_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setField('workHours', 'working_days', on ? hours.working_days.filter((d) => d !== day) : [...hours.working_days, day])}
                          className={`min-h-[44px] rounded-lg border px-4 text-sm transition-colors ${
                            on
                              ? 'border-blue-600 bg-blue-600 font-medium text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {t(`setup.weekday.${day}`)}
                        </button>
                      );
                    })}
                  </div>
                  {err('working_days') && <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">{err('working_days')}</p>}
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="work_start" label={t('setup.workHours.start')} error={err('work_start_time')} required>
                    <input id="work_start" type="time" className={inputClass} value={hours.work_start_time} onChange={(e) => setField('workHours', 'work_start_time', e.target.value)} />
                  </Field>
                  <Field id="work_end" label={t('setup.workHours.end')} error={err('work_end_time')} required>
                    <input id="work_end" type="time" className={inputClass} value={hours.work_end_time} onChange={(e) => setField('workHours', 'work_end_time', e.target.value)} />
                  </Field>
                  <Field id="break_start" label={t('setup.workHours.breakStart')} hint={t('setup.workHours.breakHint')} error={err('lunch_break_start')}>
                    <input id="break_start" type="time" className={inputClass} value={hours.lunch_break_start} onChange={(e) => setField('workHours', 'lunch_break_start', e.target.value)} />
                  </Field>
                  <Field id="break_end" label={t('setup.workHours.breakEnd')} error={err('lunch_break_end')}>
                    <input id="break_end" type="time" className={inputClass} value={hours.lunch_break_end} onChange={(e) => setField('workHours', 'lunch_break_end', e.target.value)} />
                  </Field>
                </div>

                <AlsoChanges
                  title={t('setup.alsoChanges')}
                  lines={[
                    t('setup.workHours.effectShift', {
                      name: DEFAULT_SHIFT_NAME,
                      start: hours.work_start_time || '–',
                      end: hours.work_end_time || '–',
                      hours: (workedMinutes / 60).toFixed(2),
                    }),
                    overnight ? t('setup.workHours.effectOvernight') : null,
                    daysOff.length
                      ? t('setup.workHours.effectDaysOff', { days: daysOff.map((d) => t(`setup.weekday.${WEEKDAYS[d]}`)).join(' ') })
                      : t('setup.workHours.effectNoDaysOff'),
                    t('setup.workHours.effectCalc'),
                  ].filter(Boolean)}
                />
              </div>
            )}

            {screen === 'policy' && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="grace" label={t('setup.policy.grace')} hint={t('setup.policy.graceHint')} error={err('late_grace_minutes')} required>
                    <input id="grace" type="number" min={0} max={120} step={1} className={inputClass} value={form.policy.late_grace_minutes} onChange={(e) => setField('policy', 'late_grace_minutes', e.target.value)} />
                  </Field>
                  <Field id="absent" label={t('setup.policy.absent')} hint={t('setup.policy.absentHint')} error={err('absent_by_late_minutes')} required>
                    <input id="absent" type="number" min={1} max={480} step={1} className={inputClass} value={form.policy.absent_by_late_minutes} onChange={(e) => setField('policy', 'absent_by_late_minutes', e.target.value)} />
                  </Field>
                  <Field id="ot_method" label={t('setup.policy.otMethod')} error={err('ot_method')} required>
                    <select id="ot_method" className={inputClass} value={form.policy.ot_method} onChange={(e) => setField('policy', 'ot_method', e.target.value)}>
                      {OT_METHODS.map((method) => <option key={method} value={method}>{t(`setup.policy.otMethods.${method}`)}</option>)}
                    </select>
                  </Field>
                  <Field id="ot_rounding" label={t('setup.policy.otRounding')} hint={t('setup.policy.otRoundingHint')} error={err('ot_rounding')} required>
                    <select id="ot_rounding" className={inputClass} value={form.policy.ot_rounding} onChange={(e) => setField('policy', 'ot_rounding', e.target.value)}>
                      {OT_ROUNDINGS.map((rounding) => <option key={rounding} value={rounding}>{t(`setup.policy.otRoundings.${rounding}`)}</option>)}
                    </select>
                  </Field>
                </div>
                <AlsoChanges
                  title={t('setup.alsoChanges')}
                  lines={[t('setup.policy.effectShift', { name: DEFAULT_SHIFT_NAME, minutes: form.policy.late_grace_minutes || 0 })]}
                />
              </div>
            )}

            {screen === 'holidays' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {t('setup.holidays.count', { count: form.holidays.entries.length, year: year + 543 })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const have = new Set(form.holidays.entries.map((entry) => entry.holiday_date));
                        const missing = fixedHolidaysForYear(year).filter((holiday) => !have.has(holiday.holiday_date));
                        setField('holidays', 'entries', [...form.holidays.entries, ...missing].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)));
                      }}
                    >
                      {t('setup.holidays.addFixed')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setField('holidays', 'entries', [...form.holidays.entries, { holiday_date: '', name: '' }])}>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> {t('setup.holidays.add')}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">{t('setup.holidays.note')}</p>

                {form.holidays.entries.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">{t('setup.holidays.empty')}</p>
                ) : (
                  <ul className="space-y-2">
                    {form.holidays.entries.map((entry, i) => (
                      <li key={entry.id || `new-${i}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="date"
                            aria-label={t('setup.holidays.date')}
                            className={`${inputClass} sm:w-44`}
                            min={`${year}-01-01`}
                            max={`${year}-12-31`}
                            value={entry.holiday_date}
                            onChange={(e) => setField('holidays', 'entries', form.holidays.entries.map((item, n) => (n === i ? { ...item, holiday_date: e.target.value } : item)))}
                          />
                          <input
                            type="text"
                            aria-label={t('setup.holidays.name')}
                            placeholder={t('setup.holidays.name')}
                            maxLength={100}
                            className={`${inputClass} min-w-0 flex-1`}
                            value={entry.name}
                            onChange={(e) => setField('holidays', 'entries', form.holidays.entries.map((item, n) => (n === i ? { ...item, name: e.target.value } : item)))}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={t('setup.holidays.remove', { name: entry.name || entry.holiday_date })}
                            className="h-11 w-11 p-0 text-red-700 hover:bg-red-50 hover:text-red-800"
                            onClick={() => setField('holidays', 'entries', form.holidays.entries.filter((_, n) => n !== i))}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                        {err(`entry_${i}`) && <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">{err(`entry_${i}`)}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {screen === 'departments' && (
              <div className="space-y-4">
                {err('names') && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err('names')}</p>}
                <ul className="space-y-2">
                  {form.departments.names.map((name, i) => {
                    const stored = (records.departments || []).some((row) => row.name === name);
                    return (
                      <li key={`dept-${i}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            aria-label={t('setup.departments.name')}
                            placeholder={t('setup.departments.name')}
                            maxLength={100}
                            // Renaming happens on the departments screen, where
                            // the employees of the department are moved too.
                            readOnly={stored}
                            className={`${inputClass} ${stored ? 'bg-slate-50 text-slate-600 dark:bg-slate-800/60' : ''}`}
                            value={name}
                            onChange={(e) => setField('departments', 'names', form.departments.names.map((item, n) => (n === i ? e.target.value : item)))}
                          />
                          {!stored && (
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label={t('setup.departments.remove', { name })}
                              className="h-11 w-11 p-0 text-red-700 hover:bg-red-50 hover:text-red-800"
                              onClick={() => setField('departments', 'names', form.departments.names.filter((_, n) => n !== i))}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                        {err(`name_${i}`) && <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">{err(`name_${i}`)}</p>}
                      </li>
                    );
                  })}
                </ul>
                <Button type="button" variant="outline" onClick={() => setField('departments', 'names', [...form.departments.names, ''])}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> {t('setup.departments.add')}
                </Button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('setup.departments.note')}{' '}
                  <Link to="/settings/departments" className="text-blue-700 underline hover:text-blue-900 dark:text-blue-400">{t('settings.departmentManagement')}</Link>
                </p>
              </div>
            )}

            {screen === 'payroll' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="pay_day" label={t('setup.payroll.payDay')} hint={t('setup.payroll.payDayHint')} error={err('payroll_date')} required>
                  <input id="pay_day" type="number" min={1} max={31} step={1} className={inputClass} value={form.payroll.payroll_date} onChange={(e) => setField('payroll', 'payroll_date', e.target.value)} />
                </Field>
                <Field id="pay_method" label={t('setup.payroll.method')} error={err('payment_method')} required>
                  <select id="pay_method" className={inputClass} value={form.payroll.payment_method} onChange={(e) => setField('payroll', 'payment_method', e.target.value)}>
                    {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{t(`setup.payroll.methods.${method}`)}</option>)}
                  </select>
                </Field>
                {form.payroll.payment_method === 'bank_transfer' && (
                  <div className="sm:col-span-2">
                    <Field id="bank" label={t('setup.payroll.bank')} error={err('default_bank')}>
                      <input id="bank" className={inputClass} maxLength={100} value={form.payroll.default_bank} onChange={(e) => setField('payroll', 'default_bank', e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {screen === REVIEW && plan && (
              <div className="space-y-5">
                <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {[
                    ['company', form.company.name],
                    ['workHours', `${hours.working_days.length} ${t('setup.review.daysPerWeek')} · ${hours.work_start_time}–${hours.work_end_time}`],
                    ['policy', t('setup.review.policy', { grace: form.policy.late_grace_minutes, absent: form.policy.absent_by_late_minutes })],
                    ['holidays', t('setup.holidays.count', { count: form.holidays.entries.length, year: year + 543 })],
                    ['departments', form.departments.names.join(' · ')],
                    ['payroll', `${t('setup.review.payDay', { day: form.payroll.payroll_date })} · ${t(`setup.payroll.methods.${form.payroll.payment_method}`)}`],
                  ].map(([step, summary]) => (
                    <div key={step} className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t(`setup.step.${step}`)}</dt>
                        <dd className="break-words text-sm text-slate-900 dark:text-white">{summary}</dd>
                      </div>
                      <button type="button" onClick={() => goTo(step)} className="min-h-[44px] shrink-0 px-2 text-sm text-blue-700 underline hover:text-blue-900 dark:text-blue-400">
                        {t('common.edit')}
                      </button>
                    </div>
                  ))}
                </dl>

                <AlsoChanges title={t('setup.review.willChange')} lines={describePlan(plan).map((line) => t(line.key, line.values))} />

                {results && (
                  <ul className="space-y-1.5" aria-label={t('setup.review.results')}>
                    {results.map((item) => (
                      <li key={item.section} className={`flex items-start gap-2 text-sm ${item.ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                        {item.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                        <span>
                          {t(`setup.section.${item.section}`)}: {item.ok ? t('setup.review.done') : item.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <Button type="button" variant="outline" disabled={index === 0 || saving} onClick={() => goTo(SCREENS[index - 1])}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> {t('setup.back')}
              </Button>
              {screen === REVIEW ? (
                <Button type="button" disabled={saving} onClick={save} className="bg-blue-600 hover:bg-blue-700">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {results && results.some((item) => !item.ok) ? t('setup.saveAgain') : t('setup.save')}
                </Button>
              ) : (
                <Button type="button" onClick={goNext} className="bg-blue-600 hover:bg-blue-700">
                  {t('setup.next')} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SetupWizardView;
