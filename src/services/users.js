
import { supabase } from '@/lib/customSupabaseClient';

export const userService = {
  getUsers: async () => {
    // Note: 'users' table in public schema, distinct from auth.users
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  addUser: async (userData) => {
    // This typically involves creating an auth user AND a public profile record.
    // For this service layer, we will assume we are managing the public 'users' table directly 
    // or wrapping a server-side function call if needed. 
    // Given the constraints, we'll try to insert into 'users' table.
    
    // WARNING: In a real app, you cannot create auth users from client-side without an admin function/API.
    // We will assume 'users' is the public profile table as seen in schema.
    
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select();
    if (error) throw error;
    return data[0];
  },

  updateUser: async ({ id, ...updates }) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  deleteUser: async (id) => {
    // Soft delete
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date() }) 
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
