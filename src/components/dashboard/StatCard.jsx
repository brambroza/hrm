import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * A single headline number on the dashboard.
 *
 * The card used to render a rising or falling trend arrow driven by a hardcoded
 * `trend` prop rather than by any comparison against earlier data, so it pointed
 * the same way no matter what the number did. It now shows the share of total
 * headcount, which is a figure the caller can actually justify.
 *
 * @param {string} title
 * @param {number} value
 * @param {string} subtitle
 * @param {number} percentage  share of total headcount, 0-100
 * @param {'green'|'yellow'|'red'} color
 * @param {React.ComponentType} icon
 * @param {boolean} loading
 */
const StatCard = ({ title, value, subtitle, percentage, color, icon: Icon, loading = false }) => {
  const { t } = useTranslation();

  const palette = {
    green: { chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: 'bg-emerald-500/20 text-emerald-500', blob: 'bg-emerald-500' },
    yellow: { chip: 'bg-amber-400/10 text-amber-600 dark:text-amber-400', icon: 'bg-amber-400/20 text-amber-500', blob: 'bg-amber-400' },
    red: { chip: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: 'bg-red-500/20 text-red-500', blob: 'bg-red-500' },
  };
  const tone = palette[color] || palette.green;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-6 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg overflow-hidden transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 truncate">{title}</h3>
          {loading ? (
            <div className="h-9 w-16 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
          ) : (
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h2>
          )}
        </div>
        <div className={`p-3 rounded-xl shrink-0 ${tone.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {!loading && (
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${tone.chip}`}>
            {t('dashboard.percentOfStaff', { percent: percentage })}
          </div>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
      </div>

      {/* Decorative background shape */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 ${tone.blob}`} />
    </motion.div>
  );
};

export default StatCard;
