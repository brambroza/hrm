
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, Trophy, Search, Filter } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { exportToExcel } from '@/utils/helpers';

const EmployeeAwardList = ({ awards = [] }) => {
  // Mock data if empty
  const displayAwards = awards.length > 0 ? awards : [
    { id: 1, name: 'Honorato Imogene', dept: 'Electrical', award: 'Best Capital', date: '22-08-24' },
    { id: 2, name: 'Jonathan Ibrahim', dept: 'Production', award: 'Coby Beach', date: '30-11-01' },
    { id: 3, name: 'Maisha Lucy', dept: 'Software', award: 'Best Employee', date: '22-08-24' },
  ];

  const handleExport = () => {
    exportToExcel(displayAwards, 'Employee_Awards');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700 h-full transition-colors duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Employee Award List</h3>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative hidden md:block">
             <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-500" />
             <input type="text" placeholder="Search" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors" />
           </div>
           <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
             <Filter className="w-3 h-3 mr-1" /> Filter
           </Button>
           <Button onClick={handleExport} size="sm" className="h-8 text-xs bg-slate-900 dark:bg-black text-white hover:bg-slate-800 dark:hover:bg-slate-900">
             <Download className="w-3 h-3 mr-1" /> Export
           </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="pb-3 font-medium">SL</th>
              <th className="pb-3 font-medium pl-2">Image</th>
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Department Name</th>
              <th className="pb-3 font-medium">Award Name</th>
              <th className="pb-3 font-medium text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {displayAwards.map((item, index) => (
              <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="py-3 text-slate-500 text-xs">{(index + 1).toString().padStart(2, '0')}</td>
                <td className="py-3 pl-2">
                  <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-600">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} />
                    <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-xs">EU</AvatarFallback>
                  </Avatar>
                </td>
                <td className="py-3 text-slate-900 dark:text-white font-medium">{item.name}</td>
                <td className="py-3 text-slate-500 dark:text-slate-400">{item.dept}</td>
                <td className="py-3">
                  <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 text-xs">
                    <Trophy className="w-3 h-3" />
                    {item.award}
                  </span>
                </td>
                <td className="py-3 text-right text-slate-500 font-mono text-xs">{item.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default EmployeeAwardList;
