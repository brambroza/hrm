
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldAlert } from 'lucide-react';

// Static role definitions matching the system's RLS policies and AuthContext
const ROLE_PERMISSIONS = {
  'Admin': [
    'view_dashboard', 
    'view_employees', 'add_employee', 'edit_employee', 'delete_employee', 'export_employees',
    'view_attendance', 'add_attendance', 'edit_attendance', 'delete_attendance', 'export_attendance',
    'view_payroll', 'calculate_payroll', 'export_payroll',
    'view_settings', 'edit_settings',
    'view_reports', 'export_reports',
    'manage_users'
  ],
  'Manager': [
    'view_dashboard',
    'view_employees', 'add_employee', 'edit_employee', 
    'view_attendance', 'edit_attendance', 'export_attendance',
    'view_reports', 'export_reports'
  ],
  'HR': [
    'view_dashboard',
    'view_employees', 'add_employee', 'edit_employee',
    'view_attendance', 'edit_attendance',
    'view_payroll', 'calculate_payroll'
  ],
  'Accountant': [
    'view_dashboard',
    'view_attendance',
    'view_payroll', 'calculate_payroll', 'export_payroll',
    'view_reports'
  ],
  'Employee': [
    'view_dashboard',
    'view_attendance'
  ]
};

const MODULES = ['dashboard', 'employees', 'attendance', 'payroll', 'settings', 'reports'];
const ACTIONS = ['view', 'add', 'edit', 'delete', 'export', 'calculate'];

const SetPermissionsModal = ({ isOpen, onClose, user }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (isOpen && user) {
      // Load permissions based on user role from static definitions
      // Add defensive check for user.role to prevent crashes if role is undefined
      const userRole = user.role || '';
      const rolePerms = ROLE_PERMISSIONS[userRole] || [];
      setPermissions(rolePerms);
    }
  }, [isOpen, user]);

  const getPermId = (module, action) => {
    // Handle singular/plural naming conventions to match AuthContext
    let suffix = module;
    // For actions like add/edit/delete, we typically use singular (e.g. add_employee)
    // For view/export, we typically use plural (e.g. view_employees)
    if (module === 'employees' && ['add', 'edit', 'delete'].includes(action)) {
      suffix = 'employee';
    }
    return `${action}_${suffix}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('userManagement.setPermissions')} - <span className="text-blue-500">{user?.role || 'No Role'}</span>
          </DialogTitle>
          <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-700 dark:text-blue-300">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <p>
              Permissions are currently defined by the system role <strong>{user?.role || 'N/A'}</strong>. 
              To change a user's permissions, please edit the user and assign a different role.
            </p>
          </div>
        </DialogHeader>

        <div className="py-4 overflow-x-auto max-h-[60vh]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 px-4 text-left font-medium text-slate-500">{t('permissions.module')}</th>
                {ACTIONS.map(action => (
                  <th key={action} className="py-2 px-4 text-center font-medium text-slate-500 capitalize">
                    {t(`permissions.${action}`) || action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(module => (
                <tr key={module} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 font-medium capitalize text-slate-700 dark:text-slate-300">
                    {t(`common.${module}`) || module}
                  </td>
                  {ACTIONS.map(action => {
                    const permId = getPermId(module, action);
                    const isChecked = permissions.includes(permId);
                    
                    return (
                      <td key={action} className="py-3 px-4 text-center">
                        <Checkbox 
                          checked={isChecked}
                          disabled={true}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 opacity-70"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SetPermissionsModal;
