
import { useAuth } from '@/contexts/AuthContext';

export const usePermission = () => {
  const { hasPermission, role, employeeId } = useAuth();

  // Helper functions for common actions using the context's hasPermission logic
  const canView = (module) => hasPermission(module, 'view');
  const canAdd = (module) => hasPermission(module, 'add');
  const canEdit = (module) => hasPermission(module, 'edit');
  const canDelete = (module) => hasPermission(module, 'delete');
  const canExport = (module) => hasPermission(module, 'export');
  const canCalculate = (module) => hasPermission(module, 'calculate');

  /**
   * Whether the user may open a self-service screen such as leave or OT.
   * The database lets every employee read and file their own requests without
   * a permission grant, so the screen is open to anyone with the module's view
   * permission or with an employee record linked to their login.
   * @param {string} module - Permission module, e.g. 'leave'.
   * @returns {boolean} True when the screen should be reachable.
   */
  const canUseSelfService = (module) => hasPermission(module, 'view') || Boolean(employeeId);
  
  return { 
    hasPermission,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canExport,
    canCalculate,
    canUseSelfService,
    employeeId,
    role 
  };
};
