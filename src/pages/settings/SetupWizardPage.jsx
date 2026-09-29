import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/AccessDenied';
import { applySetupPlan, loadSetupRecords } from '@/services/setup';
import SetupWizardView, { SCREENS } from '@/components/setup/SetupWizardView';
import { SETUP_STEPS, buildSetupPlan, formFromRecords, validateAll, validateStep } from '@/lib/setup/setupPlan';
import { getThaiISODate } from '@/utils/helpers';

/**
 * Guided setup. Six short steps replace six separate settings screens, and
 * answers that belong together are asked once: working hours set the system
 * settings, the default shift and the weekly days off in one go.
 * Nothing is written until the review step.
 */
const SetupWizardPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { organizationId } = useAuth();
  const { canEdit } = usePermission();

  const year = Number(getThaiISODate().slice(0, 4));
  const allowed = canEdit('system_settings');

  const [records, setRecords] = useState(null);
  const [form, setForm] = useState(null);
  const [screen, setScreen] = useState(SCREENS[0]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);
  const [dirty, setDirty] = useState(false);

  /** Read the stored records and rebuild the form from them. */
  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await loadSetupRecords(organizationId);
      setRecords(loaded);
      setForm(formFromRecords(loaded, year));
      setDirty(false);
    } catch (error) {
      setLoadError(error.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed && organizationId) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, organizationId]);

  // Closing the tab with unsaved answers asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const plan = useMemo(() => (form && records ? buildSetupPlan(form, records) : null), [form, records]);

  /**
   * Change one field of one step.
   * @param {string} step - Step the field belongs to.
   * @param {string} field - Field name.
   * @param {*} value - New value.
   */
  const setField = (step, field, value) => {
    setForm((prev) => ({ ...prev, [step]: { ...prev[step], [field]: value } }));
    setDirty(true);
    setResults(null);
  };

  const index = SCREENS.indexOf(screen);

  /** Move on when the current step is acceptable. */
  const goNext = () => {
    const found = validateStep(screen, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setScreen(SCREENS[index + 1]);
  };

  /**
   * Jump to a step from the step list. Going forward is allowed only past
   * steps that are acceptable, so the review never shows an invalid form.
   * @param {string} target - Screen to open.
   */
  const goTo = (target) => {
    const targetIndex = SCREENS.indexOf(target);
    if (targetIndex <= index) {
      setErrors({});
      setScreen(target);
      return;
    }
    const all = validateAll(form);
    const blocked = SETUP_STEPS.slice(0, targetIndex).find((step) => Object.keys(all[step]).length > 0);
    if (blocked) {
      setErrors(all[blocked]);
      setScreen(blocked);
      return;
    }
    setErrors({});
    setScreen(target);
  };

  /** Write everything, then reload so the next plan starts from what is stored. */
  const save = async () => {
    const all = validateAll(form);
    const blocked = SETUP_STEPS.find((step) => Object.keys(all[step]).length > 0);
    if (blocked) {
      setErrors(all[blocked]);
      setScreen(blocked);
      return;
    }

    setSaving(true);
    try {
      const outcome = await applySetupPlan(plan);
      setResults(outcome);
      const failed = outcome.filter((item) => !item.ok);
      if (failed.length === 0) {
        toast({ title: t('common.success'), description: t('setup.saved') });
        const loaded = await loadSetupRecords(organizationId);
        setRecords(loaded);
        setForm(formFromRecords(loaded, year));
        setDirty(false);
      } else {
        toast({
          variant: 'destructive',
          title: t('setup.savedPartly'),
          description: t('setup.savedPartlyDetail', { count: failed.length }),
        });
        // What did succeed is now stored; plan the retry from there.
        setRecords(await loadSetupRecords(organizationId));
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t('common.error'), description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) return <AccessDenied />;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center" role="status" aria-label={t('common.loading')}>
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-hidden="true" />
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{t('setup.loadFailed')} ({loadError || t('setup.noOrganization')})</span>
        </div>
        <Button onClick={load}>{t('setup.retry')}</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('setup.title')} - HRM System</title>
      </Helmet>
      <SetupWizardView
        form={form}
        records={records}
        plan={plan}
        screen={screen}
        errors={errors}
        year={year}
        saving={saving}
        results={results}
        onField={setField}
        onNext={goNext}
        onGoTo={goTo}
        onSave={save}
      />
    </>
  );
};

export default SetupWizardPage;
