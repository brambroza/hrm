import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

/**
 * Shown on the single-purpose settings screens. Changing working hours or the
 * grace period there updates one record only; the guided setup updates the
 * shift and the weekly days off with it, so the user is pointed there.
 * @returns {JSX.Element}
 */
const SetupHint = () => {
  const { t } = useTranslation();
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-200">
      <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>
        {t('setup.hint')}{' '}
        <Link to="/settings/setup" className="font-medium underline hover:text-blue-700">{t('setup.title')}</Link>
      </p>
    </div>
  );
};

export default SetupHint;
