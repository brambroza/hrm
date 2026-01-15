import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { generatePassword } from '@/utils/helpers';
import { useUsers } from '@/hooks/useUsers';

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { addUser } = useUsers();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [employees, setEmployees] = useState([]);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'Employee',
    status: 'active',
    employee_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      // Generate password on open if empty
      if (!formData.password) {
        handleAutoGenerate();
      }
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, employee_id')
      .eq('status', 'active');
    setEmployees(data || []);
  };

  const handleAutoGenerate = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.password || !formData.role) {
      toast({
        variant: 'destructive',
        title: t('validation.required'),
        description: t('validation.required')
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: 'destructive',
        title: t('validation.passwordMin'),
        description: t('validation.passwordMin')
      });
      return;
    }

    setLoading(true);
    const { error } = await addUser(formData);
    setLoading(false);

    if (!error) {
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'Employee',
        status: 'active',
        employee_id: ''
      });
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('userManagement.addUser')}
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
              placeholder="John Doe"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">{t('employees.email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800"
              placeholder="john@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">{t('userManagement.password')}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-800 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" onClick={handleAutoGenerate} title={t('userManagement.autoGenerate')}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
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
              value={formData.employee_id} 
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
              {t('common.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;