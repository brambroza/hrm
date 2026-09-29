
import { supabase } from '@/lib/customSupabaseClient';
import { assertPeriodOpen } from '@/services/payrollPeriods';

export const getPayrollCalculations = async (periodId = null) => {
  console.log('[Service] getPayrollCalculations called with periodId:', periodId);
  try {
    let query = supabase
      .from('payroll_calculations')
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position,
          salary,
          status,
          role
        ),
        period:payroll_periods (
          id,
          name,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (periodId) {
      query = query.eq('payroll_period_id', periodId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[Service] getPayrollCalculations Supabase Error:', error);
        throw error;
    }

    console.log(`[Service] getPayrollCalculations fetched ${data?.length || 0} records`);
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[Service] getPayrollCalculations Exception:', error);
    return { data: [], error };
  }
};

// Functions to manage individual payroll records
export const getPayroll = async (id) => {
    console.log('[Service] getPayroll called with id:', id);
    try {
        const { data, error } = await supabase
            .from('payroll_calculations')
            .select(`
                *,
                employee:employees (
                    id,
                    name,
                    employee_id,
                    department,
                    position,
                    salary
                ),
                period:payroll_periods (
                    id,
                    name,
                    status
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('[Service] getPayroll Supabase Error:', error);
            throw error;
        }

        console.log('[Service] getPayroll fetched successfully');
        return { data, error: null };
    } catch (error) {
        console.error('[Service] getPayroll Exception:', error);
        return { data: null, error };
    }
};

export const addPayrollCalculation = async (calcData) => {
  try {
    await assertPeriodOpen(calcData.payroll_period_id);
    const { data, error } = await supabase
      .from('payroll_calculations')
      .insert([calcData])
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding payroll calculation:', error);
    return { data: null, error };
  }
};

export const updatePayrollCalculation = async (id, updates) => {
  try {
    const { data: current, error: readError } = await supabase
      .from('payroll_calculations')
      .select('payroll_period_id')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) throw new Error('ไม่พบผลการคำนวณนี้');
    await assertPeriodOpen(current.payroll_period_id);
    const { data, error } = await supabase
      .from('payroll_calculations')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating payroll calculation:', error);
    return { data: null, error };
  }
};

export const deletePayrollCalculation = async (id) => {
  try {
    const { data: current, error: readError } = await supabase
      .from('payroll_calculations')
      .select('payroll_period_id')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) throw new Error('ไม่พบผลการคำนวณนี้');
    await assertPeriodOpen(current.payroll_period_id);
    const { error } = await supabase
      .from('payroll_calculations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting payroll calculation:', error);
    return { error };
  }
};

export const calculatePayroll = async (employeeId, periodId, baseSalary, allowances = [], deductions = []) => {
  // Basic calculation logic - in a real app this might be more complex or server-side
  const totalAllowances = allowances.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const netSalary = Number(baseSalary) + totalAllowances - totalDeductions;

  return {
    employee_id: employeeId,
    payroll_period_id: periodId,
    basic_salary: baseSalary,
    total_income: Number(baseSalary) + totalAllowances,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    status: 'PENDING'
  };
};
