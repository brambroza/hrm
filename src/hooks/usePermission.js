
import { useAuth } from '@/contexts/AuthContext';

export const usePermission = () => {
  const { hasPermission, role } = useAuth();

  // Helper functions for common actions using the context's hasPermission logic
  const canView = (module) => hasPermission(module, 'view');
  const canAdd = (module) => hasPermission(module, 'add');
  const canEdit = (module) => hasPermission(module, 'edit');
  const canDelete = (module) => hasPermission(module, 'delete');
  const canExport = (module) => hasPermission(module, 'export');
  const canCalculate = (module) => hasPermission(module, 'calculate');
  
  return { 
    hasPermission,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canExport,
    canCalculate,
    role 
  };
};
