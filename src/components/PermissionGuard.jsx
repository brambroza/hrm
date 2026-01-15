
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const PermissionGuard = ({ permission, action, children, fallback = null }) => {
  const { hasPermission } = useAuth();

  if (hasPermission(permission, action)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
};

export default PermissionGuard;
