import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarOff } from 'lucide-react';
import { formatThaiDate } from '@/utils/helpers';

/**
 * The most recent leave requests, newest first.
 *
 * Avatars previously came from api.dicebear.com, an external service: it leaked
 * a request per row, broke offline, and drew a cartoon face that had nothing to
 * do with the person. Initials are used instead, with the real photo when the
 * employee has one.
 *
 * @param {Array} leaves   leave rows joined with their employee
 * @param {boolean} loading
 */
const LeaveApplicationTable = ({ leaves = [], loading = false }) => {
  const { t } = useTranslation();

  const statusTone = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-amber-400/10 text-amber-600 dark:text-amber-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col transition-colors duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('dashboard.recentLeaveRequests')}
        </h3>
        <Link
          to="/leave"
          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {t('dashboard.seeAll')}
        </Link>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <CalendarOff className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.noLeaveRequests')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaves.map((leave) => {
              const displayName = leave.employees?.name_th || leave.employees?.name || '-';
              return (
                <div
                  key={leave.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-600 shrink-0">
                      <AvatarImage src={leave.employees?.photo_url} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500 dark:text-white text-sm">
                        {displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {displayName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {t(`leave.type.${leave.leave_type}`, leave.leave_type)} ·{' '}
                        {formatThaiDate(leave.start_date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${statusTone(leave.status)}`}
                  >
                    {t(`leave.status.${leave.status || 'pending'}`, leave.status || 'pending')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LeaveApplicationTable;
