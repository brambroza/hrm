
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateEmployeeId, logAuditTrail } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { departmentService } from '@/services/departments';
import AvatarUpload from '@/components/AvatarUpload';

const EMPTY_FORM = {
  name_th: '',
  name_en: '',
  national_id: '',
  phone: '',
  email: '',
  department: '',
  position: '',
  employment_type: '',
  branch: '',
  start_date: '',
  salary: '',
  passport_number: '',
  work_permit_number: '',
  work_permit_expiry: '',
  nationality: '',
  photo_url: '',
  role: 'employee',
  status: 'active',
};

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const employeeId = await generateEmployeeId(formData.employment_type || 'monthly', supabase);

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
        employee_id: employeeId,
        passport_number: formData.passport_number || null,
        work_permit_number: formData.work_permit_number || null,
        work_permit_expiry: formData.work_permit_expiry || null,
        nationality: formData.nationality || null,
        photo_url: formData.photo_url || null,
        status: formData.status,
        role: formData.role
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      await logAuditTrail(
        user?.id || null,
        'INSERT',
        'employees',
        data.id,
        null,
        data
      );

      toast({
        title: t('common.success'),
        description: t('employees.addedSuccessfully')
      });
      setFormData(EMPTY_FORM);
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const inputClass = "w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t('employees.addEmployee')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* The photo comes first: it is the field HR fills from the ID card in
              front of them, and it anchors the rest of the form to a face. */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5">
            <AvatarUpload
              value={formData.photo_url}
              onChange={(url) => setFormData(prev => ({ ...prev, photo_url: url || '' }))}
              fallbackText={formData.name_th || formData.name_en}
              disabled={loading}
            />
          </div>

          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('employees.basicInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('employees.nameTh')} *</label>
                <input
                  type="text"
                  name="name_th"
                  value={formData.name_th}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.nameEn')}</label>
                <input
                  type="text"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.phone')}</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.nationalId')}</label>
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Employment Info */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('employees.employment')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('employees.department')}</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">{t('employees.selectDepartment')}</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('employees.position')}</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.employmentType')}</label>
                <input
                  type="text"
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.branch')}</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.role')} *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="employee">{t('roles.employee')}</option>
                  <option value="supervisor">{t('roles.supervisor')}</option>
                  <option value="hr">{t('roles.hr')}</option>
                  <option value="manager">{t('roles.manager')}</option>
                  <option value="admin">{t('roles.admin')}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('employees.startDate')}</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.salary')}</label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  step="0.01"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('common.status')} *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="active">{t('employees.statusActive')}</option>
                  <option value="resigned">{t('employees.statusResigned')}</option>
                  <option value="terminated">{t('employees.statusTerminated')}</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('employees.migrantDocuments')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('employees.passportNumber')}</label>
                <input
                  type="text"
                  name="passport_number"
                  value={formData.passport_number}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.workPermitNumber')}</label>
                <input
                  type="text"
                  name="work_permit_number"
                  value={formData.work_permit_number}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.workPermitExpiry')}</label>
                <input
                  type="date"
                  name="work_permit_expiry"
                  value={formData.work_permit_expiry}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('employees.nationality')}</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600">
              {loading ? t('common.pleaseWait') : t('employees.addEmployee')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeModal;
