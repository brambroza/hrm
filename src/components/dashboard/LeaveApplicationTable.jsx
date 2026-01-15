
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const LeaveApplicationTable = ({ leaves, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col transition-colors duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Leave Application</h3>
        <Button variant="ghost" size="sm" className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-xs">
          See Details
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="space-y-4">
          {leaves.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">No pending applications</p>
          ) : (
            leaves.map((leave, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-600">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${index}`} />
                    <AvatarFallback className="bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">EP</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{leave.employees?.name_th || 'Unknown Employee'}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Reason: {leave.reason || 'Personal Leave'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  leave.status === 'approved' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' 
                    : 'bg-amber-400/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {leave.status || 'Pending'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeaveApplicationTable;
