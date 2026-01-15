
import { supabase } from '@/lib/customSupabaseClient';

export const integrationService = {
  getIntegrations: async () => {
    const { data, error } = await supabase
      .from('app_integrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  addIntegration: async (integration) => {
    const { data, error } = await supabase
      .from('app_integrations')
      .insert([integration])
      .select();
    if (error) throw error;
    return data[0];
  },

  updateIntegration: async ({ id, ...updates }) => {
    const { data, error } = await supabase
      .from('app_integrations')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  deleteIntegration: async (id) => {
    const { error } = await supabase
      .from('app_integrations')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
