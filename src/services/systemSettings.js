
import { supabase } from '@/lib/customSupabaseClient';

export const systemSettingsService = {
  getSystemSettings: async () => {
    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 2. Get user's organization_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (userError) throw userError;
    if (!userData?.organization_id) {
      console.warn('User has no organization assigned.');
      return null;
    }

    const orgId = userData.organization_id;

    // 3. Try to fetch settings for this org
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) throw error;

    // 4. If settings exist, return them
    if (data) return data;

    // 5. If no settings exist, create default record
    const defaultSettings = {
      org_id: orgId,
      notification_email: true,
      notification_sms: false,
      notification_in_app: true,
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      work_start_time: '09:00',
      work_end_time: '18:00',
      lunch_break_start: '12:00',
      lunch_break_end: '13:00',
      payroll_date: 25,
      payment_method: 'bank_transfer',
      default_bank: ''
    };

    const { data: newSettings, error: createError } = await supabase
      .from('system_settings')
      .insert([defaultSettings])
      .select()
      .single();

    if (createError) throw createError;
    
    return newSettings;
  },

  updateSystemSettings: async (settings) => {
    // If we have an ID, update that specific record
    if (settings.id) {
      const { data, error } = await supabase
        .from('system_settings')
        .update(settings)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } 
    
    // Fallback: If no ID provided (rare, as getSystemSettings ensures creation),
    // try to find by org_id or create new.
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
    
    if (!userData?.organization_id) throw new Error('No organization ID found');

    // Check if exists by org_id to avoid duplicates if ID was missing in frontend state
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('org_id', userData.organization_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('system_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const payload = { ...settings, org_id: userData.organization_id };
      const { data, error } = await supabase
        .from('system_settings')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }
};
