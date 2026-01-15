
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

const ManagementDecision = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-emerald-500/10 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-emerald-500/20 h-full flex flex-col justify-center items-center text-center transition-colors duration-300"
    >
      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
        <MessageSquare className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Daily Meeting</h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
        9:00 - 10:30 AM on Zoom
      </p>
      <button className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-emerald-500/25">
        Join Now
      </button>
    </motion.div>
  );
};

export default ManagementDecision;
