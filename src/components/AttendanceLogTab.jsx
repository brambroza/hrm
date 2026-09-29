
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Download, Search } from 'lucide-react';
import { exportToExcel, formatThaiTime, getThaiISODate } from '@/utils/helpers';
import { hoursBetween, toShiftPunchTimestamp } from '@/lib/thaiTime';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AttendanceLogTab = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchDate, setSearchDate] = useState(getThaiISODate());
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [searchDate]);

  const fetchData = async () => {
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active');
    
    setEmployees(empData || []);

    const { data: logData } = await supabase
      .from('attendance_logs')
      .select('*, employees(name_th, name, employee_id)')
      .eq('log_date', searchDate)
      .order('created_at', { ascending: false });

    setLogs(logData || []);
    setLoading(false);
  };

  const handleExport = () => {
    const exportData = logs.map(log => ({
      'Date': log.log_date,
      'Employee ID': log.employees?.employee_id,
      'Name': log.employees?.name_th || log.employees?.name,
      'Check In': log.check_in ? formatThaiTime(log.check_in) : '-',
      'Check Out': log.check_out ? formatThaiTime(log.check_out) : '-',
      'Hours': log.hours_worked || '-',
      'Status': log.status
    }));
    exportToExcel(exportData, `attendance_${searchDate}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowModal(true)} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Manual Entry
          </Button>
          <Button onClick={handleExport} variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* The table scrolls inside its own box so the page body never scrolls sideways on a phone. */}
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.employeeId')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.name')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendanceCalc.checkIn')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendanceCalc.checkOut')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendance.hours')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('attendance.noLogs')}
                </td>
              </tr>
            ) : (
            logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{log.employees?.employee_id}</td>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{log.employees?.name_th || log.employees?.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                  {log.check_in ? formatThaiTime(log.check_in) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                  {log.check_out ? formatThaiTime(log.check_out) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{log.hours_worked || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    log.status === 'normal' ? 'bg-green-100 text-green-800' :
                    log.status === 'late' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <ManualEntryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        employees={employees}
        onSuccess={fetchData}
      />
    </div>
  );
};

const ManualEntryModal = ({ isOpen, onClose, employees, onSuccess }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    log_date: getThaiISODate(),
    check_in: '',
    check_out: '',
    check_in_morning: '',
    check_out_morning: '',
    check_in_afternoon: '',
    check_out_afternoon: '',
    ot_in: '',
    ot_out: '',
    status: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // The first punch of the day anchors the shift; any later field with an
      // earlier clock time happened after midnight and is dated the next day.
      const firstPunch = formData.check_in || formData.check_in_morning;
      if (!firstPunch && !formData.check_out && !formData.check_out_afternoon) {
        throw new Error(t('attendance.enterAtLeastOneTime'));
      }
      const stamp = (time) =>
        time ? toShiftPunchTimestamp(formData.log_date, time, firstPunch || time) : null;

      const checkInTime = stamp(formData.check_in);
      const checkOutTime = stamp(formData.check_out);
      const checkInMorning = stamp(formData.check_in_morning);
      const checkOutMorning = stamp(formData.check_out_morning);
      const checkInAfternoon = stamp(formData.check_in_afternoon);
      const checkOutAfternoon = stamp(formData.check_out_afternoon);
      const otIn = stamp(formData.ot_in);
      const otOut = stamp(formData.ot_out);

      const hoursWorked = checkInTime && checkOutTime ? hoursBetween(checkInTime, checkOutTime) : null;

      const { error } = await supabase
        .from('attendance_logs')
        .insert([{
          employee_id: formData.employee_id,
          log_date: formData.log_date,
          check_in: checkInTime,
          check_out: checkOutTime,
          check_in_morning: checkInMorning,
          check_out_morning: checkOutMorning,
          check_in_afternoon: checkInAfternoon,
          check_out_afternoon: checkOutAfternoon,
          ot_in: otIn,
          ot_out: otOut,
          hours_worked: hoursWorked,
          status: formData.status
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Attendance log added successfully'
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
        <DialogHeader>
          <DialogTitle>Add Manual Attendance Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Employee *</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              required
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.employee_id} - {emp.name_th || emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Date *</label>
            <input
              type="date"
              value={formData.log_date}
              onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Check In</label>
              <input
                type="time"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Check Out</label>
              <input
                type="time"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Check In (AM)</label>
              <input
                type="time"
                value={formData.check_in_morning}
                onChange={(e) => setFormData({ ...formData, check_in_morning: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Check Out (AM)</label>
              <input
                type="time"
                value={formData.check_out_morning}
                onChange={(e) => setFormData({ ...formData, check_out_morning: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Check In (PM)</label>
              <input
                type="time"
                value={formData.check_in_afternoon}
                onChange={(e) => setFormData({ ...formData, check_in_afternoon: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Check Out (PM)</label>
              <input
                type="time"
                value={formData.check_out_afternoon}
                onChange={(e) => setFormData({ ...formData, check_out_afternoon: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">OT In</label>
              <input
                type="time"
                value={formData.ot_in}
                onChange={(e) => setFormData({ ...formData, ot_in: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">OT Out</label>
              <input
                type="time"
                value={formData.ot_out}
                onChange={(e) => setFormData({ ...formData, ot_out: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">Normal</option>
              <option value="late">Late</option>
              <option value="early_leave">Early Leave</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600">
              {loading ? 'Adding...' : 'Add Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceLogTab;
