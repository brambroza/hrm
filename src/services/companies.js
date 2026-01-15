
import { supabase } from '@/lib/customSupabaseClient';

export const companyService = {
  getCompany: async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();
    if (error) throw error;
    return data;
  },

  updateCompany: async ({ id, ...updates }) => {
    // If no ID provided, try to find existing first
    if (!id) {
       const existing = await companyService.getCompany();
       if (existing) id = existing.id;
    }

    let result;
    if (id) {
      result = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select();
    } else {
      result = await supabase
        .from('organizations')
        .insert([updates])
        .select();
    }
    
    if (result.error) throw result.error;
    return result.data[0];
  }
};
