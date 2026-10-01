import { supabase } from '@/lib/customSupabaseClient';

/**
 * Ask the clock-punch Edge Function to do something.
 * @param {'status'|'punch'|'link'} action - What to do.
 * @param {object} [payload] - position, lineIdToken, employeeCode, nationalId as the action needs.
 * @returns {Promise<object>} The function's answer.
 * @throws {Error} With the function's message when it refuses.
 */
export const callClock = async (action, payload = {}) => {
  const { data, error } = await supabase.functions.invoke('clock-punch', { body: { action, ...payload } });
  if (error) {
    // The function answers refusals as JSON with a status code; read its sentence.
    const context = error.context;
    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json();
        if (body?.error) {
          const refusal = new Error(body.error);
          refusal.details = body;
          throw refusal;
        }
      } catch (inner) {
        if (inner.details) throw inner;
      }
    }
    throw new Error('ติดต่อระบบไม่ได้ ลองใหม่อีกครั้ง');
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

/** Work sites, read and written through the ordinary client under RLS. */
export const workSiteService = {
  /**
   * All work sites of the organization, active first.
   * @returns {Promise<Array<object>>} Rows.
   */
  list: async () => {
    const { data, error } = await supabase
      .from('work_sites')
      .select('id, name, latitude, longitude, radius_m, is_active, created_at')
      .order('is_active', { ascending: false })
      .order('name');
    if (error) throw error;
    return data || [];
  },

  /**
   * Create or update a site.
   * @param {{ id?: string, name: string, latitude: number, longitude: number, radius_m: number, is_active?: boolean }} site - Values.
   * @returns {Promise<object>} The stored row.
   */
  save: async ({ id, ...site }) => {
    const query = id
      ? supabase.from('work_sites').update({ ...site, updated_at: new Date().toISOString() }).eq('id', id)
      : supabase.from('work_sites').insert([site]);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  /**
   * Remove a site.
   * @param {string} id - Site id.
   * @returns {Promise<void>}
   */
  remove: async (id) => {
    const { error } = await supabase.from('work_sites').delete().eq('id', id);
    if (error) throw error;
  },
};
