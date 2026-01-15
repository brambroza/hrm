
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Download, Search } from 'lucide-react';
import { exportToExcel, calculateHoursWorked } from '@/utils/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AttendanceLogTab = () => {
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
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
      .select('*, employees(name, employee_id)')
      .eq('log_date', searchDate)
      .order('created_at', { ascending: false });

    setLogs(logData || []);
    setLoading(false);
  };

  const handleExport = () => {
    const exportData = logs.map(log => ({
      'Date': log.log_date,
      'Employee ID': log.employees?.employee_id,
      'Name': log.employees?.name,
      'Check In': log.check_in ? new Date(log.check_in).toLocaleTimeString('th-TH') : '-',
      'Check Out': log.check_out ? new Date(log.check_out).toLocaleTimeString('th-TH') : '-',
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
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowModal(true)} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Manual Entry
          </Button>
          <Button onClick={handleExport} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Employee ID</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Name</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Check In</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Check Out</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Hours</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 text-sm text-white">{log.employees?.employee_id}</td>
                <td className="px-6 py-4 text-sm text-white">{log.employees?.name}</td>
                <td className="px-6 py-4 text-sm text-slate-300">
                  {log.check_in ? new Date(log.check_in).toLocaleTimeString('th-TH') : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">
                  {log.check_out ? new Date(log.check_out).toLocaleTimeString('th-TH') : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">{log.hours_worked || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    log.status === 'normal' ? 'bg-green-500/20 text-green-400' :
                    log.status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    log_date: new Date().toISOString().split('T')[0],
    check_in: '',
    check_out: '',
    status: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const checkInTime = formData.check_in ? `${formData.log_date}T${formData.check_in}:00` : null;
      const checkOutTime = formData.check_out ? `${formData.log_date}T${formData.check_out}:00` : null;
      
      const hoursWorked = checkInTime && checkOutTime ? calculateHoursWorked(checkInTime, checkOutTime) : null;

      const { error } = await supabase
        .from('attendance_logs')
        .insert([{
          employee_id: formData.employee_id,
          log_date: formData.log_date,
          check_in: checkInTime,
          check_out: checkOutTime,
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
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Add Manual Attendance Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Employee *</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.employee_id} - {emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date *</label>
            <input
              type="date"
              value={formData.log_date}
              onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Check In</label>
              <input
                type="time"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Check Out</label>
              <input
                type="time"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
