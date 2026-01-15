
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

const DailyAttendanceChart = ({ data }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Assuming data structure: [{ name: 'Dept A', present: 20, absent: 2, leave: 1 }, ...]
  const chartData = [
    { name: 'Mon', present: 45, absent: 5, leave: 2 },
    { name: 'Tue', present: 42, absent: 8, leave: 2 },
    { name: 'Wed', present: 47, absent: 3, leave: 2 },
    { name: 'Thu', present: 44, absent: 4, leave: 4 },
    { name: 'Fri', present: 40, absent: 10, leave: 2 },
    { name: 'Sat', present: 30, absent: 2, leave: 1 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Attendance Statistic</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-slate-500 dark:text-slate-400">Present</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-slate-500 dark:text-slate-400">Absent</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span className="text-slate-500 dark:text-slate-400">Leave</span></div>
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                borderColor: isDark ? '#334155' : '#e2e8f0', 
                borderRadius: '8px', 
                color: isDark ? '#fff' : '#0f172a',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Bar dataKey="present" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
            <Bar dataKey="absent" stackId="a" fill="#ef4444" />
            <Bar dataKey="leave" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default DailyAttendanceChart;
