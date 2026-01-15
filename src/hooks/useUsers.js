
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { logAuditTrail } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';

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
      const { employee_id, ...userPayload } = userData;

      // Use maybeSingle() to handle potential empty returns safely, though insert usually returns data
      const { data, error } = await supabase
        .from('users')
        .insert([userPayload])
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Failed to create user: No data returned');

      if (employee_id && employee_id !== 'none') {
        const { error: linkError } = await supabase
          .from('employees')
          .update({ user_id: data.id })
          .eq('id', employee_id);
          
        if (linkError) {
          console.error('Error linking employee:', linkError);
        }
      }

      await logAuditTrail(
        currentUser.id,
        'INSERT',
        'users',
        data.id,
        null,
        data
      );

      toast({
        title: t('common.success'),
        description: t('userManagement.userCreated')
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
      
      const { data, error } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (employee_id !== undefined) {
        await supabase
          .from('employees')
          .update({ user_id: null })
          .eq('user_id', id);

        if (employee_id && employee_id !== 'none') {
          await supabase
            .from('employees')
            .update({ user_id: id })
            .eq('id', employee_id);
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
      
      await supabase
        .from('employees')
        .update({ user_id: null })
        .eq('user_id', id);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (oldUser) {
        await logAuditTrail(
          currentUser.id,
          'DELETE',
          'users',
          id,
          oldUser,
          null
        );
      }

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
