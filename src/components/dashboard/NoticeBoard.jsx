
import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Calendar, Star } from 'lucide-react';

const NoticeBoard = () => {
  const notices = [
    { title: 'Get ready for meeting at 6 pm', type: 'Meeting', date: '22-Aug-24', priority: 'high' },
    { title: 'Management Decision', type: 'Announcement', date: '11-Jul-24', priority: 'medium' },
    { title: 'Our Organization will Organize a Annual Report', type: 'Event', date: '10-Jul-24', priority: 'low' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full transition-colors duration-300"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notice</h3>
        </div>
        <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">See Details</button>
      </div>

      <div className="space-y-4">
        {notices.map((notice, index) => (
          <div key={index} className="relative pl-4 border-l-2 border-emerald-500">
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{notice.title}</h4>
              <Star className={`w-3 h-3 ${notice.priority === 'high' ? 'text-emerald-500 fill-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-300">
                {notice.type}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <Calendar className="w-3 h-3" />
                {notice.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default NoticeBoard;
