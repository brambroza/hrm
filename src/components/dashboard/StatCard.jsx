
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, subtitle, percentage, color, icon: Icon, trend = 'up' }) => {
  const getColorClasses = () => {
    switch (color) {
      case 'green': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'yellow': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
      case 'red': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  const getIconBg = () => {
    switch (color) {
      case 'green': return 'bg-emerald-500/20';
      case 'yellow': return 'bg-amber-400/20';
      case 'red': return 'bg-red-500/20';
      default: return 'bg-emerald-500/20';
    }
  };

  const colorClass = getColorClasses();
  const iconBg = getIconBg();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-6 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg overflow-hidden transition-all duration-300`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h2>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${iconBg} ${colorClass.split(' ')[1]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <div className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {percentage}%
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
      </div>

      {/* Decorative background shape */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 ${color === 'green' ? 'bg-emerald-500' : color === 'red' ? 'bg-red-500' : 'bg-amber-400'}`} />
    </motion.div>
  );
};

export default StatCard;
