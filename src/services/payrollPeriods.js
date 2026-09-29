
import { supabase } from '@/lib/customSupabaseClient';
import { normalizeStatus, VALID_STATUSES, isPeriodClosed, CLOSED_PERIOD_MESSAGE } from '@/utils/statusValidator';

/**
 * Refuse to continue when a period is closed.
 * A database trigger (migration 0006) enforces the same rule; this check gives
 * the user a clear message before the request is sent.
 * @param {string} id - Payroll period id.
 * @returns {Promise<void>}
 * @throws {Error} When the period is closed or cannot be read.
 */
export const assertPeriodOpen = async (id) => {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('ไม่พบงวดการจ่ายนี้');
  if (isPeriodClosed(data.status)) throw new Error(CLOSED_PERIOD_MESSAGE);
};

export const getPayrollPeriods = async () => {
  console.log('[Service] getPayrollPeriods: Fetching all periods...');
  try {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('[Service] getPayrollPeriods Error:', error);
      throw error;
    }

    console.log(`[Service] getPayrollPeriods: Successfully fetched ${data?.length || 0} periods.`);
    return { data, error: null };
  } catch (error) {
    console.error('[Service] getPayrollPeriods Exception:', error);
    return { data: [], error };
  }
};

export const addPayrollPeriod = async (periodData) => {
  console.log('[Service] addPayrollPeriod: Initiation', periodData);
  
  try {
    // 1. Get Auth Context (User)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('[Service] addPayrollPeriod: Auth error', authError);
    }
    const userId = user?.id;
    console.log('[Service] addPayrollPeriod: Current User ID:', userId);

    // 2. Destructure and Validate
    const { name, start_date, end_date, status } = periodData;
    
    if (!name || !start_date || !end_date) {
      throw new Error('Missing required fields: name, start_date, or end_date');
    }
    if (end_date < start_date) {
      throw new Error('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
    }
    if (normalizeStatus(status) === VALID_STATUSES.CLOSED) {
      throw new Error('สร้างงวดใหม่ในสถานะปิดไม่ได้');
    }

    // 3. Normalize Status
    const normalizedStatus = normalizeStatus(status);
    console.log(`[Service] addPayrollPeriod: Status normalized from '${status}' to '${normalizedStatus}'`);

    // 4. Prepare Payload
    const payload = { 
      name, 
      start_date, 
      end_date, 
      status: normalizedStatus
    };

    console.log('[Service] addPayrollPeriod: Sending payload to Supabase:', payload);

    const { data, error } = await supabase
      .from('payroll_periods')
      .insert([payload])
      .select();

    if (error) {
      console.error('[Service] addPayrollPeriod Supabase Error:', error);
      throw error;
    }

    console.log('[Service] addPayrollPeriod: Success:', data);
    return { data, error: null };
  } catch (error) {
    console.error('[Service] addPayrollPeriod Exception:', error);
    return { data: null, error };
  }
};

export const updatePayrollPeriod = async (id, updates) => {
  console.log(`[Service] updatePayrollPeriod: Updating ID ${id} with:`, updates);
  try {
    await assertPeriodOpen(id);

    const { name, start_date, end_date, status } = updates;
    const payload = {};

    if (start_date && end_date && end_date < start_date) {
      throw new Error('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
    }

    if (name) payload.name = name;
    if (start_date) payload.start_date = start_date;
    if (end_date) payload.end_date = end_date;
    
    if (status) {
      const normalized = normalizeStatus(status);
      // Closing goes through closePayrollPeriod so it cannot happen as a side
      // effect of editing a name or a date.
      if (normalized === VALID_STATUSES.CLOSED) {
        throw new Error('การปิดงวดต้องทำผ่านคำสั่งปิดงวด');
      }
      payload.status = normalized;
    }

    const { data, error } = await supabase
      .from('payroll_periods')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Service] updatePayrollPeriod Supabase Error:', error);
      throw error;
    }

    console.log('[Service] updatePayrollPeriod: Success:', data);
    return { data, error: null };
  } catch (error) {
    console.error('[Service] updatePayrollPeriod Exception:', error);
    return { data: null, error };
  }
};

export const deletePayrollPeriod = async (id) => {
  console.log(`[Service] deletePayrollPeriod: Deleting ID ${id}`);
  try {
    await assertPeriodOpen(id);

    const { error } = await supabase
      .from('payroll_periods')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Service] deletePayrollPeriod Supabase Error:', error);
      throw error;
    }

    console.log('[Service] deletePayrollPeriod: Success');
    return { error: null };
  } catch (error) {
    console.error('[Service] deletePayrollPeriod Exception:', error);
    return { error };
  }
};

export const closePayrollPeriod = async (id) => {
  console.log(`[Service] closePayrollPeriod: Closing period ID ${id}`);
  try {
    const { data, error } = await supabase
      .from('payroll_periods')
      .update({ status: VALID_STATUSES.CLOSED })
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Service] closePayrollPeriod Supabase Error:', error);
      throw error;
    }

    console.log('[Service] closePayrollPeriod: Success', data);
    return { data, error: null };
  } catch (error) {
    console.error('[Service] closePayrollPeriod Exception:', error);
    return { data: null, error };
  }
};
