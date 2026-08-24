
import { supabase } from '@/lib/customSupabaseClient';

export const companyService = {
  getCompany: async (organizationId) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .limit(1)
      .single();
    if (error) throw error;
    return data;
  },

  updateCompany: async ({ id, organizationId, ...updates }) => {
    // If no ID provided, try to find existing first
    if (!id) {
       const existing = await companyService.getCompany(organizationId);
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
      if (organizationId) {
        updates.id = organizationId;
      }
      result = await supabase
        .from('organizations')
        .insert([updates])
        .select();
    }
    
    if (result.error) throw result.error;
    return result.data[0];
  }
};
