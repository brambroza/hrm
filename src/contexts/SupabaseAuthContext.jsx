
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);

  const fetchUserRoleAndPermissions = useCallback(async (userId) => {
    try {
      // 1. Fetch user role from public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (userError) throw userError;
      
      const userRole = userData?.role || 'employee';
      setRole(userRole);

      // 2. Fetch role_id from roles table
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', userRole)
        .maybeSingle();

      if (roleError) throw roleError;

      if (!roleData) {
         setPermissions([]);
         return;
      }

      // 3. Fetch permissions from role_permissions join permissions
      const { data: permData, error: permError } = await supabase
        .from('role_permissions')
        .select('permissions(module, name)')
        .eq('role_id', roleData.id);

      if (permError) throw permError;

      const loadedPermissions = permData
        .filter(item => item.permissions)
        .map(item => `${item.permissions.module}.${item.permissions.name}`);

      setPermissions(loadedPermissions);

    } catch (error) {
      console.error('Error fetching role/permissions:', error);
      setRole('employee');
      setPermissions([]);
    }
  }, []);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      await fetchUserRoleAndPermissions(session.user.id);
    } else {
      setRole(null);
      setPermissions([]);
    }
    
    setLoading(false);
  }, [fetchUserRoleAndPermissions]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
        
        if (session?.user) {
          const { error } = await supabase
            .from('users')
            .upsert({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.email
            }, {
              onConflict: 'id'
            });
          
          if (error) console.error('Error updating user record:', error);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const hasPermission = useCallback((module, action) => {
    if (role === 'admin') return true;
    const permString = `${module}.${action}`;
    return permissions.includes(permString);
  }, [role, permissions]);

  const signUp = useCallback(async (email, password, options) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    role,
    permissions,
    hasPermission,
    signUp,
    signIn,
    signOut,
    fetchUserRoleAndPermissions
  }), [user, session, loading, role, permissions, hasPermission, signUp, signIn, signOut, fetchUserRoleAndPermissions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
