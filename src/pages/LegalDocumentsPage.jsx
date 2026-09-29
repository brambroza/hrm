import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/AccessDenied';
import LegalDocumentsView from '@/components/documents/LegalDocumentsView';
import { LEGAL_DOCUMENTS } from '@/lib/legalDocuments/catalogue';
import { buildEmployeeRegister, buildWageRecord, buildWorkCertificate } from '@/lib/legalDocuments/builders';
import { buildEmployeeRegisterPdf, buildWageRecordPdf, buildWorkCertificatePdf, fileSafe } from '@/services/legalDocumentPdf';
import { employeeService } from '@/services/employees';
import { companyService } from '@/services/companies';
import { getPayrollPeriods } from '@/services/payrollPeriods';
import { getPayrollCalculations } from '@/services/payroll';
import { getThaiISODate } from '@/utils/helpers';

/**
 * Statutory documents. Reads what is stored, builds each document with the
 * pure builders and hands the result to the view; nothing is written.
 */
const LegalDocumentsPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { organizationId } = useAuth();
  const { canView } = usePermission();
  const allowed = canView('employee');
  const canPayroll = canView('payroll');
  const today = getThaiISODate();

  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [lines, setLines] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [signatory, setSignatory] = useState({ name: '', title: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null);

  /** Read the company, the employees and the pay periods. */
  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [organization, staff, periodResult] = await Promise.all([
        companyService.getCompany(organizationId),
        employeeService.getEmployees(),
        canPayroll ? getPayrollPeriods() : Promise.resolve({ data: [], error: null }),
      ]);
      if (periodResult.error) throw periodResult.error;
      setCompany(organization);
      setEmployees(staff || []);
      setPeriods(periodResult.data || []);
      setPeriodId((current) => current || periodResult.data?.[0]?.id || '');
    } catch (error) {
      setLoadError(error.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed && organizationId) load();
  }, [allowed, organizationId]);

  useEffect(() => {
    let current = true;
    if (!periodId || !canPayroll) {
      setLines([]);
      return undefined;
    }
    getPayrollCalculations(periodId).then(({ data, error }) => {
      if (!current) return;
      if (error) toast({ variant: 'destructive', title: t('common.error'), description: error.message });
      setLines(error ? [] : data);
    });
    return () => {
      current = false;
    };
  }, [periodId, canPayroll]);

  const register = useMemo(() => buildEmployeeRegister(employees, company || {}, today), [employees, company, today]);
  const period = periods.find((entry) => entry.id === periodId);
  const wageRecord = useMemo(
    () => (period ? buildWageRecord(lines, period.name || '', company || {}) : null),
    [lines, period, company],
  );
  const employee = employees.find((entry) => entry.id === employeeId);
  const certificate = useMemo(
    () =>
      employee
        ? buildWorkCertificate(employee, company || {}, { issuedOn: today, signatoryName: signatory.name, signatoryTitle: signatory.title })
        : null,
    [employee, company, today, signatory],
  );

  const employeeOptions = useMemo(
    () =>
      [...employees]
        .sort((a, b) => (a.employee_id || '').localeCompare(b.employee_id || ''))
        .map((entry) => ({ id: entry.id, label: `${entry.employee_id || ''} ${entry.name_th || entry.name || ''}`.trim() })),
    [employees],
  );

  /**
   * Build the chosen document and save it.
   * @param {'employee-register' | 'wage-record' | 'work-certificate'} id - Document to produce.
   * @returns {Promise<void>}
   */
  const handleDownload = async (id) => {
    setBusy(id);
    try {
      if (id === 'employee-register') {
        (await buildEmployeeRegisterPdf(register)).save(`ทะเบียนลูกจ้าง_${today}.pdf`);
      } else if (id === 'wage-record' && wageRecord) {
        (await buildWageRecordPdf(wageRecord)).save(`เอกสารการจ่ายค่าจ้าง_${fileSafe(wageRecord.period)}.pdf`);
      } else if (id === 'work-certificate' && certificate) {
        (await buildWorkCertificatePdf(certificate, company || {})).save(`หนังสือรับรองการทำงาน_${fileSafe(employee.employee_id || employee.name)}.pdf`);
      }
      toast({ title: t('common.success'), description: t('documents.downloaded') });
    } catch (error) {
      toast({ variant: 'destructive', title: t('common.error'), description: error.message || String(error) });
    } finally {
      setBusy(null);
    }
  };

  if (!allowed) return <AccessDenied />;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <Helmet>
        <title>{t('documents.title')}</title>
      </Helmet>
      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('common.loading')}
        </p>
      )}
      {loadError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{t('documents.loadError')}: {loadError}</span>
          <Button type="button" variant="outline" size="sm" onClick={load}>{t('documents.retry')}</Button>
        </div>
      )}
      {!loading && !loadError && (
        <LegalDocumentsView
          documents={LEGAL_DOCUMENTS}
          register={register}
          periods={periods}
          periodId={periodId}
          wageRecord={wageRecord}
          employees={employeeOptions}
          employeeId={employeeId}
          certificate={certificate}
          signatory={signatory}
          canPayroll={canPayroll}
          busy={busy}
          onPeriod={setPeriodId}
          onEmployee={setEmployeeId}
          onSignatory={(key, value) => setSignatory((current) => ({ ...current, [key]: value }))}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default LegalDocumentsPage;
