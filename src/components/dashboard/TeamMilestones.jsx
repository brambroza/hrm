import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PartyPopper, UserPlus, Award } from 'lucide-react';
import { formatThaiDate } from '@/utils/helpers';

/**
 * New joiners this month and work anniversaries falling this month.
 *
 * This replaces the old EmployeeAwardList, which listed three invented English
 * names against an "award" table that does not exist in the schema. Both lists
 * here are derived from employees.start_date, which is always populated.
 *
 * @param {Array} milestones  [{ employee, type: 'new'|'anniversary', years, date }]
 * @param {boolean} loading
 */
const TeamMilestones = ({ milestones = [], loading = false }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full transition-colors duration-300"
    >
      <div className="flex items-center gap-2 mb-5">
        <PartyPopper className="w-5 h-5 text-emerald-500" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('dashboard.milestones')}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
          <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
            <PartyPopper className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.noMilestones')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.slice(0, 5).map((item) => {
            const displayName = item.employee.name_th || item.employee.name || '';
            const Icon = item.type === 'new' ? UserPlus : Award;
            return (
              <Link
                key={`${item.employee.id}-${item.type}`}
                to={`/employees/${item.employee.id}`}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
              >
                <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-600">
                  <AvatarImage src={item.employee.photo_url} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500 dark:text-white text-xs">
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {item.employee.department || '-'} · {formatThaiDate(item.date)}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                  {item.type === 'new'
                    ? t('dashboard.newJoiner')
                    : t('dashboard.workAnniversary', { count: item.years })}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default TeamMilestones;
