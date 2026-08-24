
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { logAuditTrail } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { departmentService } from '@/services/departments';

const EditEmployeeModal = ({ isOpen, onClose, employee, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (employee) {
      setFormData({
        name_th: employee.name_th || employee.name || '',
        name_en: employee.name_en || '',
        national_id: employee.national_id || '',
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        department: employee.department || '',
        employment_type: employee.employment_type || '',
        branch: employee.branch || '',
        salary: employee.salary || '',
        start_date: employee.start_date || '',
        status: employee.status || 'active',
        role: employee.role || 'employee',
        passport_number: employee.passport_number || '',
        work_permit_number: employee.work_permit_number || '',
        work_permit_expiry: employee.work_permit_expiry || '',
        nationality: employee.nationality || '',
        photo_url: employee.photo_url || ''
      });
    }
  }, [employee]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await departmentService.getDepartments();
        setDepartments(data || []);
      } catch (error) {
        console.error('Failed to load departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name_th || formData.name_en,
        name_th: formData.name_th,
        name_en: formData.name_en || null,
        national_id: formData.national_id || null,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        department: formData.department,
        employment_type: formData.employment_type || null,
        branch: formData.branch || null,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        start_date: formData.start_date || null,
        status: formData.status,
        role: formData.role,
        passport_number: formData.passport_number || null,
        work_permit_number: formData.work_permit_number || null,
        work_permit_expiry: formData.work_permit_expiry || null,
        nationality: formData.nationality || null,
        photo_url: formData.photo_url || null
      };

      const { data, error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', employee.id)
        .select()
        .single();

      if (error) throw error;

      await logAuditTrail(
        user?.id || null,
        'UPDATE',
        'employees',
        employee.id,
        employee,
        data
      );

      toast({
        title: 'Success',
        description: 'Employee updated successfully'
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const inputClass = "w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name (Thai) *</label>
                <input
                  type="text"
                  name="name_th"
                  value={formData.name_th || ''}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Name (English)</label>
                <input
                  type="text"
                  name="name_en"
                  value={formData.name_en || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>National ID</label>
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Employment Info */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Status *</label>
                <select
                  name="status"
                  value={formData.status || 'active'}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="resigned">Resigned</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <select
                  name="department"
                  value={formData.department || ''}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Employment Type</label>
                <input
                  type="text"
                  name="employment_type"
                  value={formData.employment_type || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Branch</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Role *</label>
                <select
                  name="role"
                  value={formData.role || 'employee'}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="employee">Employee</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="hr">HR</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Salary</label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary || ''}
                  onChange={handleChange}
                  step="0.01"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Identity & Work Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Passport Number</label>
                <input
                  type="text"
                  name="passport_number"
                  value={formData.passport_number || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Work Permit Number</label>
                <input
                  type="text"
                  name="work_permit_number"
                  value={formData.work_permit_number || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Work Permit Expiry</label>
                <input
                  type="date"
                  name="work_permit_expiry"
                  value={formData.work_permit_expiry || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Photo URL</label>
                <input
                  type="text"
                  name="photo_url"
                  value={formData.photo_url || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeModal;
