
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { logAuditTrail } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { isUserRole } from '@/lib/roles';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('messages.errorOccurred')
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  const addUser = async (userData) => {
    setLoading(true);
    try {
      if (!isUserRole(userData.role)) throw new Error(t('userManagement.invalidRole'));

      // A login can only be created with the service role key, which must
      // never reach the browser. The create-user Edge Function does it, checks
      // the caller's permission, and writes the audit row. The password goes
      // to Supabase Auth only; it is never stored in an application table.
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          full_name: userData.full_name,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          status: userData.status,
          employee_id: userData.employee_id && userData.employee_id !== 'none' ? userData.employee_id : null,
        },
      });

      if (error) {
        // The function's own message is in the response body, not in error.message.
        let message = t('userManagement.createUnavailable');
        try {
          const body = await error.context?.json?.();
          if (body?.error) message = body.error;
        } catch (_) { /* keep the default message */ }
        throw new Error(message);
      }
      if (!result?.user) throw new Error(t('userManagement.createUnavailable'));

      const data = result.user;

      toast({
        variant: result.warning ? 'destructive' : 'default',
        title: result.warning ? t('common.warning') : t('common.success'),
        description: result.warning || t('userManagement.userCreated')
      });
      
      fetchUsers();
      return { data, error: null };

    } catch (err) {
      console.error('Error adding user:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.message
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id, updates) => {
    setLoading(true);
    try {
      // Use maybeSingle() to safely handle case where user ID might not exist
      const { data: oldUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      if (!oldUser) throw new Error('User not found');
      
      const { employee_id, ...userUpdates } = updates;
      if (userUpdates.role !== undefined && !isUserRole(userUpdates.role)) {
        throw new Error(t('userManagement.invalidRole'));
      }

      const { data, error } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) throw new Error(t('userManagement.updateRefused'));

      // undefined means "leave the link alone"; null means "remove it".
      if (employee_id !== undefined) {
        const { error: unlinkError } = await supabase
          .from('employees')
          .update({ user_id: null })
          .eq('user_id', id);
        if (unlinkError) throw unlinkError;

        if (employee_id) {
          const { data: linked, error: linkError } = await supabase
            .from('employees')
            .update({ user_id: id })
            .eq('id', employee_id)
            .select('id');
          if (linkError) throw linkError;
          if (!linked || linked.length === 0) throw new Error(t('userManagement.linkRefused'));
        }
      }

      await logAuditTrail(
        currentUser.id,
        'UPDATE',
        'users',
        id,
        oldUser,
        data
      );

      toast({
        title: t('common.success'),
        description: t('userManagement.userUpdated')
      });
      
      fetchUsers();
      return { data, error: null };

    } catch (err) {
      console.error('Error updating user:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.message
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    setLoading(true);
    try {
      // Use maybeSingle() to safely fetch user before deletion
      const { data: oldUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      // If user doesn't exist, we can consider deletion "successful" or throw error. 
      // Here we proceed but log warning if needed.
      
      if (!oldUser) throw new Error(t('userManagement.updateRefused'));
      if (id === currentUser.id) throw new Error(t('userManagement.cannotRemoveSelf'));

      // Users are deactivated, not deleted: the audit trail and approvals
      // refer to them, and the table has no DELETE policy. A row-level delete
      // blocked by RLS returns no error, so the old code reported success
      // while the user stayed in place.
      const { data: updated, error } = await supabase
        .from('users')
        .update({ status: 'inactive' })
        .eq('id', id)
        .select('id, status');

      if (error) throw error;
      if (!updated || updated.length === 0) throw new Error(t('userManagement.updateRefused'));

      await logAuditTrail(
        currentUser.id,
        'UPDATE',
        'users',
        id,
        oldUser,
        { ...oldUser, status: 'inactive' }
      );

      toast({
        title: t('common.success'),
        description: t('userManagement.userDeleted')
      });
      
      fetchUsers();
      return { error: null };

    } catch (err) {
      console.error('Error deleting user:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.message
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser
  };
};
