import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';

const EditUserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { updateUser } = useUsers();
  
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    status: '',
    employee_id: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'Employee',
        status: user.status || 'active',
        employee_id: user.employee_id || ''
      });
      fetchEmployees();
    }
  }, [isOpen, user]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, employee_id')
      .eq('status', 'active');
    setEmployees(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.role) {
      toast({
        variant: 'destructive',
        title: t('validation.required'),
        description: t('validation.required')
      });
      return;
    }

    setLoading(true);
    const updates = {
      full_name: formData.full_name,
      role: formData.role,
      status: formData.status,
      employee_id: formData.employee_id === 'none' ? null : formData.employee_id
    };

    const { error } = await updateUser(user.id, updates);
    setLoading(false);

    if (!error) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('userManagement.editUser')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="full_name">{t('userProfile.fullName')}</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">{t('employees.email')}</Label>
            <Input
              id="email"
              value={formData.email}
              disabled
              className="bg-slate-100 dark:bg-slate-800/50 opacity-70"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="role">{t('userManagement.role')}</Label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                  <SelectValue placeholder={t('userManagement.role')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">{t('roles.Admin')}</SelectItem>
                  <SelectItem value="Manager">{t('roles.Manager')}</SelectItem>
                  <SelectItem value="HR">{t('roles.HR')}</SelectItem>
                  <SelectItem value="Accountant">{t('roles.Accountant')}</SelectItem>
                  <SelectItem value="Employee">{t('roles.Employee')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">{t('userManagement.status')}</Label>
              <Select 
                value={formData.status} 
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                  <SelectValue placeholder={t('userManagement.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('userManagement.active')}</SelectItem>
                  <SelectItem value="inactive">{t('userManagement.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employee">{t('userManagement.linkToEmployee')}</Label>
            <Select 
              value={formData.employee_id || 'none'} 
              onValueChange={(val) => setFormData({ ...formData, employee_id: val })}
            >
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                <SelectValue placeholder={t('userManagement.selectEmployee')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.employee_id} - {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;