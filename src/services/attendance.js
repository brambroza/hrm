
import { supabase } from '@/lib/customSupabaseClient';

export const attendanceService = {
  getAttendance: async () => {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, employees(name_th, name, employee_id)')
      .order('log_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  addAttendance: async (record) => {
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([record])
      .select();
    if (error) throw error;
    return data[0];
  },

  updateAttendance: async ({ id, ...updates }) => {
    const { data, error } = await supabase
      .from('attendance_logs')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  deleteAttendance: async (id) => {
    const { error } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
