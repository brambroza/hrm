import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ChevronRight } from 'lucide-react';
import { formatThaiDate } from '@/utils/helpers';

/**
 * Work permits, visas and 90-day reports that are about to expire.
 *
 * This replaces the old ManagementDecision card, which showed a fixed
 * "Daily Meeting 9:00-10:30 AM on Zoom" with a button that did nothing.
 * An expiring work permit is a real and expensive problem for Thai employers
 * of foreign staff, and the data is already on the employee record.
 *
 * @param {Array} alerts   output of getDocumentExpiryAlerts()
 * @param {boolean} loading
 */
const DocumentExpiryAlerts = ({ alerts = [], loading = false }) => {
  const { t } = useTranslation();

  // Anything inside a month is urgent enough to colour differently.
  const toneFor = (days) =>
    days <= 30
      ? 'text-red-600 dark:text-red-400 bg-red-500/10'
      : 'text-amber-600 dark:text-amber-400 bg-amber-400/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full transition-colors duration-300"
    >
      <div className="flex items-center gap-2 mb-5">
        <ShieldAlert className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('dashboard.documentExpiry')}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
          <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.noDocumentExpiry')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <Link
              key={`${alert.employee.id}-${alert.document}`}
              to={`/employees/${alert.employee.id}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {alert.employee.name_th || alert.employee.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {t(`dashboard.document.${alert.document}`, alert.document)} ·{' '}
                  {formatThaiDate(alert.expiryDate)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${toneFor(alert.daysRemaining)}`}
                >
                  {t('dashboard.daysLeft', { count: alert.daysRemaining })}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
          {alerts.length > 5 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 text-center">
              {t('dashboard.andMore', { count: alerts.length - 5 })}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default DocumentExpiryAlerts;
