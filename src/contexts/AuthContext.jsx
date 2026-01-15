
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoleAndPermissions(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // We do NOT blindly update users table on every auth change to avoid overwriting roles
        await fetchUserRoleAndPermissions(session.user.id);
      } else {
        setRole(null);
        setPermissions([]);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRoleAndPermissions = async (userId) => {
    try {
      // 1. Fetch user role from public.users table
      // Use maybeSingle() to handle cases where user record might not exist yet
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (userError) throw userError;
      
      const userRole = userData?.role || 'employee';
      setRole(userRole);

      // 2. Fetch role_id from roles table
      // Use .eq() for proper filtering and maybeSingle() to handle "no role found" gracefully
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', userRole)
        .maybeSingle();

      if (roleError) throw roleError;

      if (!roleData) {
         // Fallback if role not found in DB
         console.warn(`Role '${userRole}' not found in roles table.`);
         setPermissions([]);
         return;
      }

      // 3. Fetch permissions from role_permissions join permissions
      const { data: permData, error: permError } = await supabase
        .from('role_permissions')
        .select('permissions(module, name)')
        .eq('role_id', roleData.id);

      if (permError) throw permError;

      // Flatten permissions to array of strings "module.action"
      const loadedPermissions = permData
        .filter(item => item.permissions) // Filter out any null permissions
        .map(item => `${item.permissions.module}.${item.permissions.name}`);

      setPermissions(loadedPermissions);

    } catch (error) {
      console.error('Error fetching role/permissions:', error);
      // Fail safely
      setRole('employee');
      setPermissions([]);
    }
  };

  const hasPermission = (module, action) => {
    // Admin override
    if (role === 'admin') return true; 

    // Check specific permission
    const permString = `${module}.${action}`;
    return permissions.includes(permString);
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    role,
    permissions,
    hasPermission,
    signIn,
    signOut,
    fetchUserRoleAndPermissions
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
