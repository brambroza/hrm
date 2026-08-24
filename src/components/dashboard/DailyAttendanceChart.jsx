import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Attendance over the last seven days.
 *
 * The chart used to accept a `data` prop and then ignore it, plotting a fixed
 * Mon-Sat series instead. It now renders exactly what it is given, and says so
 * when there is nothing to plot rather than inventing a week of activity.
 *
 * @param {Array} data  [{ name: '5 ส.ค.', present, absent, leave }]
 * @param {boolean} loading
 */
const DailyAttendanceChart = ({ data = [], loading = false }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const hasData = data.some((day) => day.present || day.absent || day.leave);

  const legend = [
    { key: 'present', color: 'bg-emerald-500', label: t('dashboard.present') },
    { key: 'absent', color: 'bg-red-500', label: t('dashboard.absent') },
    { key: 'leave', color: 'bg-amber-400', label: t('dashboard.onLeave') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full transition-all duration-300"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t('dashboard.attendanceLast7Days')}
        </h3>
        <div className="flex gap-4 text-xs">
          {legend.map(({ key, color, label }) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-slate-500 dark:text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[250px] w-full">
        {loading ? (
          <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.noAttendanceYet')}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: isDark ? '#33415533' : '#f1f5f9' }}
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#0f172a',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ fontSize: '12px' }}
                formatter={(value, key) => [value, t(`dashboard.${key === 'leave' ? 'onLeave' : key}`)]}
              />
              <Bar dataKey="present" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="absent" stackId="a" fill="#ef4444" />
              <Bar dataKey="leave" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

export default DailyAttendanceChart;
