import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, ListChecks } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { loadSetupRecords } from '@/services/setup';
import { SETUP_STEPS, setupStatus } from '@/lib/setup/setupPlan';
import { getThaiISODate } from '@/utils/helpers';

/**
 * Tells whoever can configure the system how far the setup has got, and takes
 * them to it. Shows nothing once every step is done, to people who cannot
 * change settings, or when the status cannot be read.
 * @returns {JSX.Element|null}
 */
const SetupBanner = () => {
  const { t } = useTranslation();
  const { organizationId } = useAuth();
  const { canEdit } = usePermission();
  const [status, setStatus] = useState(null);

  const allowed = canEdit('system_settings');

  useEffect(() => {
    if (!allowed || !organizationId) return undefined;
    let cancelled = false;

    loadSetupRecords(organizationId)
      .then((records) => {
        if (!cancelled) setStatus(setupStatus(records, Number(getThaiISODate().slice(0, 4))));
      })
      // The banner is a convenience; the page under it reports its own errors.
      .catch(() => {
        if (!cancelled) setStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [allowed, organizationId]);

  if (!allowed || !status || status.complete) return null;

  const missing = SETUP_STEPS.filter((step) => !status.steps[step]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10 sm:flex-row sm:items-center">
      <ListChecks className="h-6 w-6 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
          {t('setup.banner.progress', { done: status.done, total: status.total })}
        </p>
        <p className="text-sm text-blue-900 dark:text-blue-300">
          {t('setup.banner.missing')}: {missing.map((step) => t(`setup.step.${step}`)).join(' · ')}
        </p>
      </div>
      <Link
        to="/settings/setup"
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
      >
        {t('setup.banner.continue')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
};

export default SetupBanner;
