
import { supabase } from '@/lib/customSupabaseClient';

export const employeeService = {
  getEmployees: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  addEmployee: async (employee) => {
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select();
    if (error) throw error;
    return data[0];
  },

  updateEmployee: async ({ id, ...updates }) => {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  deleteEmployee: async (id) => {
    // Soft delete usually, but sticking to request for CRUD delete logic
    const { error } = await supabase
      .from('employees')
      .update({ status: 'terminated' }) // Soft delete preference for HR systems
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
