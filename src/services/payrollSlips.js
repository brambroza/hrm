
import { supabase } from '@/lib/customSupabaseClient';

export const getPayrollSlips = async (periodId = null) => {
  try {
    let query = supabase
      .from('payroll_slips')
      .select(`
        *,
        calculation:payroll_calculations (
           *,
           employee:employees (
             name,
             employee_id,
             department,
             position
           ),
           period:payroll_periods (
             name,
             start_date,
             end_date
           )
        )
      `)
      .order('generated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    
    // Filter by periodId in memory if needed, since joining tables filtering can be complex in simple Supabase queries
    let filteredData = data;
    if (periodId) {
        filteredData = data.filter(slip => slip.calculation?.payroll_period_id === periodId);
    }

    return { data: filteredData, error: null };
  } catch (error) {
    console.error('Error fetching payroll slips:', error);
    return { data: [], error };
  }
};

export const addPayrollSlip = async (slipData) => {
  try {
     const { data, error } = await supabase
      .from('payroll_slips')
      .insert([slipData])
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding payroll slip:', error);
    return { data: null, error };
  }
};

export const updatePayrollSlip = async (id, updates) => {
    try {
        const { data, error } = await supabase
            .from('payroll_slips')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating payroll slip:', error);
        return { data: null, error };
    }
};

export const deletePayrollSlip = async (id) => {
    try {
      const { error } = await supabase
        .from('payroll_slips')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting payroll slip:', error);
      return { error };
    }
  };

export const generatePayrollSlip = async (calculationId, employeeId, slipData) => {
  try {
    const { data, error } = await supabase
      .from('payroll_slips')
      .insert([{
        payroll_calculation_id: calculationId,
        employee_id: employeeId,
        slip_data: slipData,
        generated_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error generating payroll slip:', error);
    return { data: null, error };
  }
};

export const sendPayrollSlipEmail = async (slipId, email) => {
  // Placeholder for email sending logic (e.g., via Edge Function)
  console.log(`Sending slip ${slipId} to ${email}`);
  return { success: true };
};
