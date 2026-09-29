import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

/**
 * Shown in place of a screen whose feature is not built yet.
 *
 * The backup and integration screens used to simulate success: a "backup" was
 * a row with a random file size, and "connected" only meant a form was saved.
 * A screen that reports protection or a connection that does not exist is
 * worse than no screen, so those routes show this notice until the real
 * feature ships.
 *
 * @param {{titleKey: string, messageKey: string}} props - Translation keys for the heading and the explanation.
 * @returns {JSX.Element} The notice.
 */
const FeatureUnavailable = ({ titleKey, messageKey }) => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t(titleKey)} - HRM System</title>
      </Helmet>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t(titleKey)}</h1>
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t(messageKey)}</p>
        </div>
        <Link to="/settings" className="inline-block text-sm text-blue-600 hover:text-blue-800">
          {t('featureUnavailable.back')}
        </Link>
      </div>
    </>
  );
};

export default FeatureUnavailable;
