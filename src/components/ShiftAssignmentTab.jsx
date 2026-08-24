import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmationModal from '@/components/ConfirmationModal';
import { getThaiISODate, logAuditTrail } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';

const ShiftAssignmentTab = () => {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Confirmation Modal State
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [empRes, shiftRes, assignRes] = await Promise.all([
      supabase.from('employees').select('*').eq('status', 'active'),
      supabase.from('shifts').select('*'),
      supabase.from('shift_assignments').select('*, employees(name_th, employee_id), shifts(shift_name)')
    ]);

    setEmployees(empRes.data || []);
    setShifts(shiftRes.data || []);
    setAssignments(assignRes.data || []);
    setLoading(false);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const oldAssignment = assignments.find(item => item.id === deleteId) || null;

    const { error } = await supabase
      .from('shift_assignments')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete assignment'
      });
    } else {
      if (oldAssignment) {
        await logAuditTrail(
          user?.id || null,
          'DELETE',
          'shift_assignments',
          deleteId,
          oldAssignment,
          null
        );
      }
      toast({
        title: 'Success',
        description: 'Assignment deleted successfully'
      });
      fetchData();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* The table scrolls inside its own box so the page body never scrolls sideways on a phone. */}
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.employee')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendance.shift')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendance.startDate')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('attendance.endDate')}</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('attendance.noAssignments')}
                </td>
              </tr>
            ) : (
            assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                  {assignment.employees?.employee_id} - {assignment.employees?.name_th}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{assignment.shifts?.shift_name}</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{assignment.start_date}</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{assignment.end_date || 'Ongoing'}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => confirmDelete(assignment.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <AssignmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        employees={employees}
        shifts={shifts}
        onSuccess={fetchData}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Assignment"
        description="Are you sure you want to delete this shift assignment? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

const AssignmentModal = ({ isOpen, onClose, employees, shifts, onSuccess }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    shift_id: '',
    start_date: getThaiISODate(),
    end_date: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('shift_assignments')
        .insert([{
          ...formData,
          end_date: formData.end_date || null
        }])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        await logAuditTrail(
          user?.id || null,
          'INSERT',
          'shift_assignments',
          data[0].id,
          null,
          data[0]
        );
      }

      toast({
        title: 'Success',
        description: 'Shift assignment created successfully'
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
          <DialogTitle>Add Shift Assignment</DialogTitle>
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
                <option key={emp.id} value={emp.id}>{emp.employee_id} - {emp.name_th}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Shift *</label>
            <select
              value={formData.shift_id}
              onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
              required
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Shift</option>
              {shifts.map(shift => (
                <option key={shift.id} value={shift.id}>{shift.shift_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">End Date (Optional)</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600">
              {loading ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftAssignmentTab;
