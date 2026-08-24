import { supabase } from '@/lib/customSupabaseClient';

export const departmentService = {
  getDepartments: async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  },

  addDepartment: async (payload) => {
    const { data, error } = await supabase
      .from('departments')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateDepartment: async (id, updates) => {
    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteDepartment: async (id) => {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
