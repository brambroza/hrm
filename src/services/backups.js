
import { supabase } from '@/lib/customSupabaseClient';

export const backupService = {
  getBackups: async () => {
    const { data, error } = await supabase
      .from('system_backups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  createBackup: async (backupMeta) => {
    // In a real scenario, this might trigger a server function. 
    // Here we just record the metadata as requested.
    const { data, error } = await supabase
      .from('system_backups')
      .insert([backupMeta])
      .select();
    if (error) throw error;
    return data[0];
  },

  deleteBackup: async (id) => {
    const { error } = await supabase
      .from('system_backups')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
