import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';

/**
 * Shown in place of a page the current role may not open.
 *
 * The same block was copy-pasted into thirteen pages as untranslated English
 * ("Access Denied"), which is the one screen a Thai user is most likely to hit
 * on their first day. Centralising it also means the wording only has to be
 * fixed once.
 *
 * @param {string} [message]  optional override for the explanatory line
 */
const AccessDenied = ({ message }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-slate-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {t('common.accessDenied')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm">
        {message || t('common.accessDeniedHint')}
      </p>
    </div>
  );
};

export default AccessDenied;
