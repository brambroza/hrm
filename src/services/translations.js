
import { supabase } from '@/lib/customSupabaseClient';

export const translationService = {
  getTranslations: async () => {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .order('key', { ascending: true });
    if (error) throw error;
    return data;
  },

  addTranslation: async (translation) => {
    const { data, error } = await supabase
      .from('translations')
      .insert([translation])
      .select();
    if (error) throw error;
    return data[0];
  },

  updateTranslation: async ({ id, ...updates }) => {
    const { data, error } = await supabase
      .from('translations')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  deleteTranslation: async (id) => {
    const { error } = await supabase
      .from('translations')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
