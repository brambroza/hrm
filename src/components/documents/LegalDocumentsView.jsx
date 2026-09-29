import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Download, FileText, Loader2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GROUP_LABELS, LEGAL_DISCLAIMER, STATUS_LABELS } from '@/lib/legalDocuments/catalogue';

const STATUS_STYLES = {
  available: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  planned: { icon: Clock, className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  manual: { icon: PenLine, className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const fieldClass =
  'h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200';

/**
 * Status of a document as a labelled badge.
 * @param {{ status: 'available' | 'planned' | 'manual' }} props - Status to show.
 * @returns {JSX.Element} The badge.
 */
const StatusBadge = ({ status }) => {
  const { icon: Icon, className } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
};

/**
 * Warning box listing what is missing.
 * @param {{ title: string, items: string[], children?: React.ReactNode }} props - Heading, lines and an optional action.
 * @returns {JSX.Element | null} The box, or nothing when there are no items.
 */
const Warning = ({ title, items, children }) =>
  items.length ? (
    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-9">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {children}
    </div>
  ) : null;

/**
 * Download button with a busy state.
 * @param {{ busy: boolean, disabled?: boolean, onClick: () => void, children: React.ReactNode }} props - State and handler.
 * @returns {JSX.Element} The button.
 */
const DownloadButton = ({ busy, disabled, onClick, children }) => (
  <Button type="button" onClick={onClick} disabled={busy || disabled} className="bg-emerald-600 text-white hover:bg-emerald-700">
    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
    {children}
  </Button>
);

/**
 * Statutory documents screen: what can be produced now, then the full list of
 * what the law asks of an employer with the state of each.
 *
 * @param {object} props - Everything shown; the view holds no state.
 * @param {import('@/lib/legalDocuments/catalogue').LegalDocument[]} props.documents - The catalogue.
 * @param {import('@/lib/legalDocuments/builders').EmployeeRegister | null} props.register - Built register.
 * @param {{ id: string, name: string }[]} props.periods - Pay periods.
 * @param {string} props.periodId - Selected pay period.
 * @param {import('@/lib/legalDocuments/builders').WageRecord | null} props.wageRecord - Built record of the selected period.
 * @param {{ id: string, label: string }[]} props.employees - Employees to choose from.
 * @param {string} props.employeeId - Selected employee.
 * @param {import('@/lib/legalDocuments/builders').WorkCertificate | null} props.certificate - Built certificate.
 * @param {{ name: string, title: string }} props.signatory - Who signs the certificate.
 * @param {boolean} props.canPayroll - Whether the user may see pay figures.
 * @param {string | null} props.busy - Id of the document being generated.
 * @returns {JSX.Element} The screen.
 */
const LegalDocumentsView = ({
  documents, register, periods, periodId, wageRecord, employees, employeeId, certificate, signatory, canPayroll, busy,
  onPeriod, onEmployee, onSignatory, onDownload,
}) => {
  const { t } = useTranslation();
  const groups = Object.keys(GROUP_LABELS);

  return (
    <div className="space-y-8 text-slate-900">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileText className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          {t('documents.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t('documents.subtitle')}</p>
      </header>

      <section aria-labelledby="documents-issue" className="space-y-4">
        <h2 id="documents-issue" className="text-lg font-semibold">{t('documents.issue')}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold">{t('documents.register.title')}</h3>
            <p className="text-sm text-slate-600">{t('documents.register.description')}</p>
            <p className="text-sm text-slate-700">{t('documents.register.count', { count: register?.rows.length ?? 0 })}</p>
            <Warning
              title={t('documents.register.missing')}
              items={(register?.missing || []).map((entry) => t('documents.register.missingItem', { label: entry.label, count: entry.count }))}
            >
              <p className="mt-2 pl-6">
                <Link to="/employees" className="font-medium text-emerald-700 underline">{t('documents.register.fix')}</Link>
              </p>
            </Warning>
            <div className="mt-auto pt-2">
              <DownloadButton busy={busy === 'employee-register'} disabled={!register?.rows.length} onClick={() => onDownload('employee-register')}>
                {t('documents.download')}
              </DownloadButton>
            </div>
          </article>

          <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold">{t('documents.wage.title')}</h3>
            <p className="text-sm text-slate-600">{t('documents.wage.description')}</p>
            {canPayroll ? (
              <>
                <label className="text-sm font-medium" htmlFor="documents-period">{t('documents.wage.period')}</label>
                <select id="documents-period" className={fieldClass} value={periodId} onChange={(event) => onPeriod(event.target.value)}>
                  {periods.length === 0 && <option value="">{t('documents.wage.noPeriod')}</option>}
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>{period.name}</option>
                  ))}
                </select>
                {wageRecord && (
                  <p className="text-sm text-slate-700">
                    {t('documents.wage.summary', { count: wageRecord.rows.length, net: wageRecord.totals.net })}
                  </p>
                )}
                <Warning
                  title={t('documents.wage.caution')}
                  items={[
                    t('documents.wage.blank', { columns: (wageRecord?.unavailable || []).join(' ') }),
                    ...(wageRecord?.inconsistent ? [t('documents.wage.inconsistent', { count: wageRecord.inconsistent })] : []),
                  ].filter(() => Boolean(wageRecord?.rows.length))}
                />
                <div className="mt-auto pt-2">
                  <DownloadButton busy={busy === 'wage-record'} disabled={!wageRecord?.rows.length} onClick={() => onDownload('wage-record')}>
                    {t('documents.download')}
                  </DownloadButton>
                </div>
              </>
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{t('documents.wage.noPermission')}</p>
            )}
          </article>

          <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold">{t('documents.certificate.title')}</h3>
            <p className="text-sm text-slate-600">{t('documents.certificate.description')}</p>
            <label className="text-sm font-medium" htmlFor="documents-employee">{t('documents.certificate.employee')}</label>
            <select id="documents-employee" className={fieldClass} value={employeeId} onChange={(event) => onEmployee(event.target.value)}>
              <option value="">{t('documents.certificate.choose')}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.label}</option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="min-w-0">
                <label className="text-sm font-medium" htmlFor="documents-signatory">{t('documents.certificate.signatory')}</label>
                <input id="documents-signatory" className={fieldClass} maxLength={120} value={signatory.name} onChange={(event) => onSignatory('name', event.target.value)} />
              </div>
              <div className="min-w-0">
                <label className="text-sm font-medium" htmlFor="documents-signatory-title">{t('documents.certificate.signatoryTitle')}</label>
                <input id="documents-signatory-title" className={fieldClass} maxLength={120} value={signatory.title} onChange={(event) => onSignatory('title', event.target.value)} />
              </div>
            </div>
            {certificate && certificate.problems.length === 0 && (
              <blockquote className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {certificate.paragraphs.slice(0, 2).join(' ')}
              </blockquote>
            )}
            <Warning title={t('documents.certificate.problems')} items={certificate?.problems || []} />
            <div className="mt-auto pt-2">
              <DownloadButton
                busy={busy === 'work-certificate'}
                disabled={!certificate || certificate.problems.length > 0}
                onClick={() => onDownload('work-certificate')}
              >
                {t('documents.download')}
              </DownloadButton>
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="documents-list" className="space-y-4">
        <h2 id="documents-list" className="text-lg font-semibold">{t('documents.list')}</h2>
        {groups.map((group) => (
          <div key={group} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <h3 className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">{GROUP_LABELS[group]}</h3>
            <ul className="divide-y divide-slate-100">
              {documents.filter((document) => document.group === group).map((document) => (
                <li key={document.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 font-medium">{document.name}</p>
                    <StatusBadge status={document.status} />
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-600 md:grid-cols-3">
                    <div className="min-w-0"><dt className="inline font-medium text-slate-700">{t('documents.basis')}: </dt><dd className="inline">{document.basis}</dd></div>
                    <div className="min-w-0"><dt className="inline font-medium text-slate-700">{t('documents.audience')}: </dt><dd className="inline">{document.audience}</dd></div>
                    <div className="min-w-0"><dt className="inline font-medium text-slate-700">{t('documents.timing')}: </dt><dd className="inline">{document.timing}</dd></div>
                  </dl>
                  {document.note && <p className="mt-2 text-sm text-slate-500">{document.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-xs leading-relaxed text-slate-500">{LEGAL_DISCLAIMER}</p>
      </section>
    </div>
  );
};

export default LegalDocumentsView;
