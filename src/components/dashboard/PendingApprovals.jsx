import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, CalendarOff, Clock, ChevronRight } from 'lucide-react';

/**
 * The approval queue waiting on the person looking at the dashboard.
 *
 * This replaces the old NoticeBoard, which rendered three hard-coded English
 * announcements dated 2024. Pending leave and OT requests are the one thing an
 * HR user or a supervisor genuinely needs on the first screen, and both counts
 * come from data the dashboard already loads.
 *
 * @param {number} leaveCount    pending leave requests
 * @param {number} otCount       pending OT requests
 * @param {boolean} loading      whether the counts are still being fetched
 */
const PendingApprovals = ({ leaveCount = 0, otCount = 0, loading = false }) => {
  const { t } = useTranslation();

  const queues = [
    {
      key: 'leave',
      label: t('dashboard.pendingLeave'),
      count: leaveCount,
      to: '/leave',
      icon: CalendarOff,
      tone: 'text-amber-600 dark:text-amber-400 bg-amber-400/10',
    },
    {
      key: 'ot',
      label: t('dashboard.pendingOt'),
      count: otCount,
      to: '/ot-requests',
      icon: Clock,
      tone: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    },
  ];

  const total = leaveCount + otCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full transition-colors duration-300"
    >
      <div className="flex items-center gap-2 mb-5">
        <ClipboardCheck className="w-5 h-5 text-emerald-500" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('dashboard.pendingApprovals')}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
          <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <ClipboardCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.noPendingApprovals')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queues.map(({ key, label, count, to, icon: Icon, tone }) => (
            <Link
              key={key}
              to={to}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-slate-900 dark:text-white">{count}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PendingApprovals;
