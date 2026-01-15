
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmationModal from '@/components/ConfirmationModal';

const ShiftSetupTab = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  
  // Confirmation Modal State
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setShifts(data || []);
    }
    setLoading(false);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete shift'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Shift deleted successfully'
      });
      fetchShifts();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingShift(null); setShowModal(true); }} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Shift
        </Button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Shift Name</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Type</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Time</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Break</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Late Tolerance</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td className="px-6 py-4 text-sm text-white">{shift.shift_name}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{shift.shift_type}</td>
                <td className="px-6 py-4 text-sm text-slate-300">
                  {shift.start_time} - {shift.end_time}
                  {shift.cross_day_shift && <span className="ml-2 text-yellow-400 text-xs">(Cross-day)</span>}
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">{shift.break_minutes} min</td>
                <td className="px-6 py-4 text-sm text-slate-300">{shift.late_tolerance_minutes} min</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingShift(shift); setShowModal(true); }}
                      className="text-yellow-400 hover:text-yellow-300 hover:bg-slate-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => confirmDelete(shift.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShiftFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        shift={editingShift}
        onSuccess={fetchShifts}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Shift"
        description="Are you sure you want to delete this shift? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

const ShiftFormModal = ({ isOpen, onClose, shift, onSuccess }) => {
  const [formData, setFormData] = useState({
    shift_name: '',
    shift_type: 'Fixed',
    start_time: '',
    end_time: '',
    break_minutes: 0,
    late_tolerance_minutes: 0,
    early_leave_tolerance_minutes: 0,
    cross_day_shift: false
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (shift) {
      setFormData(shift);
    } else {
      setFormData({
        shift_name: '',
        shift_type: 'Fixed',
        start_time: '',
        end_time: '',
        break_minutes: 0,
        late_tolerance_minutes: 0,
        early_leave_tolerance_minutes: 0,
        cross_day_shift: false
      });
    }
  }, [shift]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (shift) {
        const { error } = await supabase
          .from('shifts')
          .update(formData)
          .eq('id', shift.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert([formData]);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Shift ${shift ? 'updated' : 'created'} successfully`
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
          <DialogTitle>{shift ? 'Edit Shift' : 'Add New Shift'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Shift Name *</label>
            <input
              type="text"
              value={formData.shift_name}
              onChange={(e) => setFormData({ ...formData, shift_name: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Shift Type *</label>
            <select
              value={formData.shift_type}
              onChange={(e) => setFormData({ ...formData, shift_type: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Fixed">Fixed</option>
              <option value="Rotating">Rotating</option>
              <option value="Flexi">Flexi</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">End Time *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Break (min)</label>
              <input
                type="number"
                value={formData.break_minutes}
                onChange={(e) => setFormData({ ...formData, break_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Late Tolerance (min)</label>
              <input
                type="number"
                value={formData.late_tolerance_minutes}
                onChange={(e) => setFormData({ ...formData, late_tolerance_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Early Leave Tolerance (min)</label>
              <input
                type="number"
                value={formData.early_leave_tolerance_minutes}
                onChange={(e) => setFormData({ ...formData, early_leave_tolerance_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cross_day"
              checked={formData.cross_day_shift}
              onChange={(e) => setFormData({ ...formData, cross_day_shift: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="cross_day" className="text-sm text-slate-300">Cross-day shift</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600">
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftSetupTab;
